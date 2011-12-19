var connect = require('connect')
  , assert = require('assert')
  , proxy = require('../proxy')
  , sa = require('superagent')
  , request = require('request')

function response (path, status, body) {
  this.all(path, function (req, res, next) {
    res.writeHead(status);
    res.end(body);
  });
}
connect(connect.router(function (app) {
  app.r = response;
  app.r('/200', 200, '8001');
  app.r('/404', 404, '8001 404');
  app.r('/500', 500, '8001 500');
  app.r('/tamper', 200, 'origin');
})).listen(8001);

connect(function (req, res, next) {
  res.writeHead(200);
  res.end('8002');
}).listen(8002);

describe('proxy', function () {
  describe('reverse proxy', function (done) {
    var proxyApp = connect(proxy.prepare());
    before(function () {
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8001 }));
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8002 }));
      proxyApp.listen(8088);
    });
    it('proxy 200', function (done) {
      request('http://127.0.0.1:8088/200', function (err, res, body) {
        body.should.equal('8001');
        done();
      });
    });
    it('proxy to next server when 404', function (done) {
      request('http://127.0.0.1:8088/404', function (err, res, body) {
        body.should.equal('8002');
        done();
      });
    });
    it('proxy to next server when 500', function (done) {
      request('http://127.0.0.1:8088/500', function (err, res, body) {
        body.should.equal('8002');
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
      proxyApp.use(proxy.http({ host: '127.0.0.1', port: 8001, tamper: function (body) {
        return body.replace('origin', 'tampered');
      }}));
      proxyApp.listen(8088);
    });
    it('tamper response body', function (done) {
      request('http://127.0.0.1:8088/tamper', function (err, res, body) {
        body.should.equal('tampered');
        done();
      });
    });
    after(function () {
      proxyApp.close();
    });
  });
});

