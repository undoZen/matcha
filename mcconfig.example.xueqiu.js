var connect = require('connect')
  , proxy = require('./lib/proxy')

var mc = exports = module.exports = {
    prefix: '/__mc'
  , proxy: [ { host: '127.0.0.1', port: 7878 }
           , { host: 'xueqiu.com', port: 80 }
           ]
  , lib: __dirname + '/public/matcha'
  , ajax: __dirname + '/mcajax'
  , test: __dirname + '/mctest'
  , host: '127.0.0.1'
  , port: 8088
}

