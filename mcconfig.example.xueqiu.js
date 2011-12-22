var connect = require('connect')
  , proxy = require('./lib/proxy')

var mc = exports = module.exports = {
    prefix: '/_mc'
  , proxy: connect()
  , lib: __dirname + '/public/matcha'
  , ajax: __dirname + '/mcajax'
  , test: __dirname + '/mctest'
}

function proxyHost(host) {
  return function (_, req) {
    return !req.url.indexOf(mc.prefix) ? false : host
  }
}

mc.proxy = connect()
  .use(proxy.http({ host: proxyHost('127.0.0.1'), port: 7878 }))
  .use(proxy.http({ host: proxyHost('xueqiu.com'), port: 80 }))
  .use(proxy.http())

if (require.main === module) {
  mc.proxy.listen(8088);
}
