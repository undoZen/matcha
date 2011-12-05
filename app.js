var routes = require('./routes')
  , connect = require('connect')
  , fs = require('fs')
  , path = require('path')
  , proxy = require('./proxy')

var proxyApp = connect(proxy.prepare);
proxyApp.use(function (req, res, next) {
  /*
  if (req.originalUrl.indexOf('/') === 0) {
    //普通代理
    req.proxy.host = '127.0.0.1';
    req.proxy.port = 7878;
  } else {
    //反向代理
    req.proxyHostname = '127.0.0.1';
    req.proxyPort = 7878;
  }
  */
  proxy.toHttp(req, res, next, { host: '127.0.0.1', port: 7878 });
});
proxyApp.use(function (req, res, next) {
  proxy.toHttp(req, res, next, { host: 'xueqiu.com', port: 80 });
});
proxyApp.listen(8088);

