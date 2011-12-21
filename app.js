var express = require('express')
  , routes = require('./routes')
  , proxy = require('./proxy')
  , io = require('socket.io')

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views')
     .set('view engine', 'jade')
     .set('sfprefix', '/__sf')

  function proxyHost(host) {
    return function (_, req) {
      return !req.url.indexOf(app.set('sfprefix')) ? false : host
    }
  }

  app.use(proxy.prepare())
     .use(proxy.bodyParser())
     .use(express.methodOverride())
     .use(app.set('sfprefix'), require('stylus').middleware({ src: __dirname + '/public' }))
     .use(app.set('sfprefix'), app.router)
     .use(app.set('sfprefix'), express['static'](__dirname + '/public'))
     .use(proxy.http({ host: proxyHost('127.0.0.1'), port: 7878 }))
     .use(proxy.http({ host: proxyHost('xueqiu.com'), port: 80 }))
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', routes.index);

io = io.listen(app)
app.listen(8088);

io.sockets.on('connection', function (socket) {
  console.log('connection');
})

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
