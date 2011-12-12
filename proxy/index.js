var http = require('http')
  , connect = require('connect')
  , Deferred = require('Deferred')

try {
  var zlib = require('zlib');
} catch (e) {
  console.log('WARNING: no zlib module. Accept-Encoding header will be removed.');
}

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
proxy.prepare = function (req, res, next) {
  req.proxy = {};
  var match = /^http:\/\/([^\/]+)(.*)/.exec(req.originalUrl), host_port;
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
    req.proxy.isReverse = true;
  }

  req.proxy = {
      host: host_port[0]
    , port: parseInt(host_port[1], 10) || 80
    , path: req.url
    , method: req.method
    , headers: req.headers
  };
  req.proxy.headers.host = req.proxy.host + (req.proxy.port == 80 ? '' : ':' + req.proxy.port);
  //TODO: 关于代理的 Proxy-Connection: keep-alive 细节，还需要研究
  if ('proxy-connection' in req.proxy.headers) {
    delete req.proxy.headers['proxy-connection'];
  }

  req.pBody = (function () {
    var d = new Deferred(), buffers = [];
    req.on('data', function (buffer) {
      buffers.push(buffer);
    });
    req.on('end',  function () {
      d.resolve(buffers);
    });
    return d.promise();
  }());

  next();
}

var toHttp = proxy.toHttp = function (req, res, next, options) {
  var tamper = options && options.tamper || function (proxyRes, res) {
        proxyRes.on('data', function (chunk) {
          res.write(chunk);
        });
        proxyRes.on('end', function (chunk) {
          res.end();
        });
      }
    , _options = _extend({}, req.proxy);

  'host port path method headers'.split(' ').forEach(function (p) {
    if (options && options[p]) {
      _options[p] = options[p];
    };
  });
  _options.headers.host = _options.host+':'+_options.port;
  var pathInfo = _options.path+' ('+_options.host+':'+_options.port+')';

  console.log('proxy to '+pathInfo);
  var proxyReq = http.request(
          _options
        , function (proxyRes) {
            proxyRes.on('error', function (err) {
              console.error('proxyRes error');
              next(err);
            });
            if (proxyRes.statusCode >= 400) {
              console.log('     '+proxyRes.statusCode+' '+pathInfo);
              return next();
            }
            console.log('     '+proxyRes.statusCode+' '+pathInfo);
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            tamper(proxyRes, res);
          }
      );
  proxyReq.on('error', function (err) {
    console.error(err);
    next(err);
  });
  req.pBody.then(function (buffers) {
    buffers.forEach(function(buffer) {
      proxyReq.write(buffer);
    });
    proxyReq.end();
  });
};

