var express = require('express')
  , connect = require('connect')
  , routes = require('./routes')
  , proxy = require('./lib/proxy')
  , io = require('socket.io')
  , u = require('./lib/u')

var app = module.exports = express.createServer();

var mc
try {
  mc = require('./mcconfig.js')
} catch (e) {
  mc =  { prefix: '/__mc'
        , lib: __dirname + '/public/matcha'
        , ajax: __dirname + '/mcajax'
        , test: __dirname + '/mctest'
        , port: 8088 }
}

var proxyHost = function(host) {
  return function (_, req) {
    return !req.url.indexOf(mc.prefix) ? false : host
  }
}

var proxyTamper = function(body) {
  return body;
}

if (!(mc.proxy instanceof connect.HTTPServer)) {
  mc._proxy = Array.isArray(mc.proxy) ? mc.proxy : []
  mc.proxy = connect()
  mc._proxy.forEach(function(option) {
    mc.proxy.use(proxy.http(u.extend(option, { host: proxyHost(option.host), tamper: proxyTamper })))
  })
  mc.proxy.use(proxy.http(
    { host: function(host, req) {
        return !req.url.indexOf(mc.prefix + '/blank') ? host : false
      }
    , path: function(path) {
        return path.replace(mc.prefix + '/blank', mc.prefix + '/_blank')
      }
    }))
  mc.proxy.use(proxy.http())
}

app.configure(function(){
  app
    .set('views', __dirname + '/views')
    .set('view engine', 'jade')
    .set('mcprefix', mc.prefix)

  app
    .use(proxy.prepare())
    .use(proxy.bodyParser())
    .use(express.methodOverride())
    .use(mc.prefix, require('stylus').middleware({ src: __dirname + '/public' }))
    .use(mc.prefix, app.router)
    .use(mc.prefix, express['static'](__dirname + '/public'))
    .use(mc.prefix + '/lib', express['static'](mc.lib))
    .use(mc.proxy)
    .use(function(req, res, next) {
           res.send('/* Cannot ' + req.method + ' ' + req.url + ' */', 404);
         })

  app.helpers({
      _p: mc.prefix
  })
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/_blank', function(req, res){
  res.render('blank', { layout: false, locals: { title: 'Matcha Blank' }})
})

io = io.listen(app)

io.sockets.on('connection', function (socket) {
  console.log('connection');
  socket.on('ua', function(ua) {
    console.log(ua)
  })
  'start,suite,suite end,test,pending,pass,fail,end'
    .split(',')
    .forEach(function(ev) {
      console.log(ev);
      socket.on(ev, function(title) {
        console.log(title);
      })
    })
})

if (require.main === module) {
  app.listen(mc.port);
  console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
}
