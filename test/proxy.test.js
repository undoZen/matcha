var connect = require('connect')
  , assert = require('assert')
  , proxy = require('../lib/proxy')
  , request = require('request')
  , zlib = require('zlib')
  ;

describe('proxy', function () {
  var app1, app2, app3;
  before(function() {
    app1 = connect(connect.router(function (app) {
      app.r = function response (path, status, body) {
        this.all(path, function (req, res, next) {
          res.writeHead(status, {'Content-Type': 'text/plain'});
          res.end(body);
        });
      };
      app.r('/200', 200, '8001');
      app.r('/proxy', 404, '404 not found');
      app.r('/404', 404, '8001 404');
      app.r('/500', 500, '8001 500');
      app.all('/tamper', function (req, res, next) {
        if (req.headers['accept-encoding'] && ~req.headers['accept-encoding'].indexOf('gzip')) {
          res.writeHead(200, {'Vary': 'Accept-Encoding', 'Content-Encoding': 'gzip', 'Content-Type': 'text/plain'});
          zlib.gzip(new Buffer('origin'), function(err, result) {
            res.end(result);
          });
        } else {
          res.writeHead(200, {'Content-Type': 'text/plain'});
          res.end('origin');
        }
      });
    })).listen(8001);

    app2 = connect(function (req, res, next) {
      if ('/proxy' === req.url) {
        res.writeHead(404);
        res.end();
      } else {
        res.writeHead(200);
        res.end('8002');
      }
    }).listen(8002);

    app3 = connect(function (req, res, next) {
      res.writeHead(200);
      res.end('8003');
    }).listen(8003);
  });

  describe('proxy', function (done) {
    var proxyApp = connect(proxy.prepare())
      , proxyRequest = request.defaults({ proxy: 'http://127.0.0.1:8099' });
    before(function () {
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8001, log: false }));
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8002, log: false }));
      proxyApp.use(proxy.http({}));
      proxyApp.listen(8099);
    });
    it('proxy 200', function (done) {
      proxyRequest('http://127.0.0.1:8099/200', function (err, res, body) {
        body.should.equal('8001');
        done();
      });
    });
    it('proxy to next server when 404', function (done) {
      proxyRequest('http://127.0.0.1:8099/404', function (err, res, body) {
        body.should.equal('8002');
        done();
      });
    });
    it('proxy to next server when 500', function (done) {
      proxyRequest('http://127.0.0.1:8099/500', function (err, res, body) {
        body.should.equal('8002');
        done();
      });
    });
    it('http proxy finally', function (done) {
      proxyRequest('http://127.0.0.1:8003/proxy', function (err, res, body) {
        body.should.equal('8003');
        done();
      });
    });
    after(function () {
      proxyApp.close();
    });
  });

  describe('reverse proxy', function (done) {
    var proxyApp = connect(proxy.prepare());
    before(function () {
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8001, log: false }));
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8002, log: false }));
      proxyApp.use(proxy.http());
      proxyApp.listen(8099);
    });
    it('proxy 200', function (done) {
      request('http://127.0.0.1:8099/200', function (err, res, body) {
        body.should.equal('8001');
        done();
      });
    });
    it('proxy to next server when 404', function (done) {
      request('http://127.0.0.1:8099/404', function (err, res, body) {
        body.should.equal('8002');
        done();
      });
    });
    it('proxy to next server when 500', function (done) {
      request('http://127.0.0.1:8099/500', function (err, res, body) {
        body.should.equal('8002');
        done();
      });
    });
    it('not found finally', function (done) {
      request('http://127.0.0.1:8099/proxy', function (err, res, body) {
        body.should.equal('Cannot GET /proxy');
        done();
      });
    });
    after(function () {
      proxyApp.close();
    });
  });

  describe('tamper response body', function () {
    var proxyApp = connect(proxy.prepare());
    before(function () {
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8001, log: false, tamper: function (body) {
        return body.replace('origin', 'tampered');
      }}));
      proxyApp.listen(8099);
    });
    it('tamper response body', function (done) {
      request('http://127.0.0.1:8099/tamper', function (err, res, body) {
        body.should.equal('tampered');
        done();
      });
    });
    it('tamper response body with gzip', function (done) {
      request({
          uri: 'http://127.0.0.1:8099/tamper'
        , headers: { 'Accept-Encoding': 'gzip' }
        , onResponse: function (err, res) {
            var gunzip = zlib.createGunzip()
              , body = '';
            res.pipe(gunzip);
            gunzip.on('data', function(chunk) {
              body += chunk.toString('utf8');
            });
            gunzip.on('end', function() {
              body.should.equal('tampered');
              done();
            });
          }
      });
    });
    after(function () {
      proxyApp.close();
    });
  });
  after(function () {
    app1.close();
    app2.close();
    app3.close();
  });
});

