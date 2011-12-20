var connect = require('connect')
  , fs = require('fs')
  , path = require('path')
  , proxy = require('./proxy')

var app = exports = module.exports = connect(proxy.prepare());
app.use(proxy.http({ host: '127.0.0.1', port: 7878 }))
   .use(proxy.http({ host: 'xueqiu.com', port: 80 }))
   .listen(8088);
