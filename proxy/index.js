var http = require('http')
  , connect = require('connect')
  , Stream = require('stream').Stream
  , zlib = require('zlib')
  , util = require('util')
  , u = require('../u')
  ;

function _extend(orig) {
  if (!orig instanceof Object) {
    orig = {};
  }
  Array.prototype.slice.call(arguments, 1).forEach(function (obj) {
    Object.keys(obj || {}).forEach(function (key) {
      orig[key] = obj[key];
    });
  });
  return orig;
}

var proxy = module.exports = {};
/*
* 准备代理的 middleware, 作为第一个 connect middleware 来使用，作用是将代理网址
* 标准化（对普通代理和反向代理通用），在 req.proxy 对象中记录。
* 因为此 middleware 监听了 req 的 data 事件和 end 事件，会与 connect.bodyParse()
* 冲突。
*/
proxy.prepare = function () {
  /*
  req.prototype.bodyStream = function () {
    var stream = new Stream
      , buf
      , i = -1;
    if (!this.bodyBuffers) {
      return;
    }
    for (;buf = this.bodyBuffers[++i];) {
      stream.emit('data', buf);
    }
  };
  */
  return function (req, res, next) {
    req.proxy = {};
    var match = /^http:\/\/([^\/]+)(.*)/.exec(req.originalUrl)
      , host_port
      ;
    if (match) {
      host_port = match[1].split(':');
      req.url = match[2] || '/';
    } else {
      if (!req.headers.host) {
        res.writeHead(400);
        res.end('Please specificate a HOST header for reverse proxy.');
        return;
      }
      host_port = req.headers.host.split(':');
    }

    req.proxy = {
        host: host_port[0]
      , port: parseInt(host_port[1], 10) || 80
      , path: req.url
      , method: req.method
      , headers: req.headers
      , isReverse: !match
    };
    req.proxy.headers.host = req.proxy.host + (req.proxy.port == 80 ? '' : ':' + req.proxy.port);
    //TODO: 关于代理的 Proxy-Connection: keep-alive 细节，还需要研究
    if ('proxy-connection' in req.proxy.headers) {
      delete req.proxy.headers['proxy-connection'];
    }

    req.bodyBuffers = [];
    req.on('data', function (buf) {
      req.bodyBuffers.push(buf);
    });
    req.on('end',  function () {
      next();
    });
  };
};

function TamperStream (tamper) {
  Stream.call(this)
  this.writable = this.readable = true;
  if ('function' === typeof tamper) {
    this._body = [];
    this.write = function (str) {
      if ('string' !== typeof str) {
        str = str.toString('utf8');
      }
      this._body.push(str);
    };
    this.end = function () {
      try {
        this.emit('data', tamper(this._body.join('')));
        this.emit('end');
      } catch (e) {
        this.emit('error', e);
      }
    };
  }
}
util.inherits(TamperStream, Stream);
u.extend(TamperStream.prototype, {
    write: function (b) { this.emit('data', b); }
  , end: function () { this.emit('end'); }
  , error: function (b) { this.emit('error', b); }
  , close: function () { this.emit('close'); }
});

proxy.http = function (options) {
  var logOn = options && false !== options.log
    , tamperOn = options && options.tamper
  return function (req, res, next) {
    var tamperStream = tamperOn && new TamperStream(options.tamper)
      , _options = u.extend({}, req.proxy)
    'host port path method headers'.split(' ').forEach(function (p) {
      if (options && options[p]) {
        _options[p] = 'function' === typeof options[p]
                    ? options[p](_options[p] || 'headers' === p
                                              ? _options[p] = {}
                                              : void 0)
                    : options[p];
      };
    });

    if (!_options.host) { // host 都没有，proxy 个毛啊
      return next();
    }

    if (req.proxy.isReverse === true //prevent infinite loop
        && _options.host === req.proxy.host
        && _options.port === req.proxy.port
        && _options.path === req.proxy.path
        && _options.method === req.proxy.method
    ) {
      return next();
    }

    _options.headers.host = _options.host+':'+_options.port;
    var pathInfo = _options.path+' ('+_options.host+':'+_options.port+')';

    logOn && console.log('proxy to '+pathInfo);
    var proxyReq = http.request(
            _options
          , function (proxyRes) {
              proxyRes.on('error', function (err) {
                console.error('proxyRes error');
                next(err);
              });
              if (proxyRes.statusCode >= 400) {
                logOn && console.log('     '+proxyRes.statusCode+' '+pathInfo);
                return next();
              }
              logOn && console.log('     '+proxyRes.statusCode+' '+pathInfo);
              res.writeHead(proxyRes.statusCode, proxyRes.headers);

              var ecd = proxyRes.headers['content-encoding'];
              if (tamperOn && ecd && 'gzip' === ecd) {
                proxyRes
                  .pipe(zlib.createGunzip())
                  .pipe(tamperStream)
                  .pipe(zlib.createGzip())
                  .pipe(res);
              } else if (tamperOn && ecd && 'deflate' === ecd) {
                proxyRes
                  .pipe(zlib.createInflate())
                  .pipe(tamperStream)
                  .pipe(zlib.createDeflate())
                  .pipe(res);
              } else if (tamperOn) {
                proxyRes.pipe(tamperStream).pipe(res);
              } else {
                proxyRes.pipe(res);
              }
            }
        );
    proxyReq.on('error', function (err) {
      if ('ECONNREFUSED' === err.errno) {
        logOn && console.log('  econnr '+pathInfo)
        next()
      } else {
        console.error(err);
        next(err);
      }
    });
    req.bodyBuffers.forEach(function(buffer) {
      proxyReq.write(buffer);
    });
    proxyReq.end();
  };
};

proxy.bodyParser = require('./bodyParser');
