var connect = require('connect')
  , proxy = require('./lib/proxy')

var mc = exports = module.exports = {
    prefix: '/__mc'
  , lib: __dirname + '/public/matcha'
  , ajax: __dirname + '/mcajax'
  , test: __dirname + '/mctest'
  , host: '127.0.0.1'
  , port: 8088
}

connect(connect['static']('/data/deploy/snowball/html')).listen(7890)

var env = process.env.NODE_ENV || 'development'

if ('test' === env) {
  mc.proxy =  [ { host: '192.168.1.198', port: 80 } ]
} else if ('local' === env) {
  mc.proxy =  [ { host: '127.0.0.1', port: 7890 }
              , { host: '127.0.0.1', port: 7878 }
              ]
} else if ('online' === env) {
  mc.proxy =  [ {} ]
} else if ('test-online' === env) {
  mc.proxy =  [ { host: '192.168.1.198', port: 80 }
              , {}
              ]
} else if ('local-test' === env) {
  mc.proxy =  [ { host: '127.0.0.1', port: 7890 }
              , { host: '127.0.0.1', port: 7878 }
              , { host: '192.168.1.198', port: 80 }
              ]
} else if ('local-test-online' === env) {
  mc.proxy =  [ { host: '127.0.0.1', port: 7890 }
              , { host: '127.0.0.1', port: 7878 }
              , { host: '192.168.1.198', port: 80 }
              , {}
              ]
} else {
  //defalt: local-online
  mc.proxy =  [ { host: '127.0.0.1', port: 7890 }
              , { host: '127.0.0.1', port: 7878 }
              , {}
              ]
}
