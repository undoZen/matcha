var express = require('express')
  , routes = require('./routes')
  , proxy = require('./lib/proxy')
  , io = require('socket.io')

var app = module.exports = express.createServer();

var mc
try {
  mc = require('./mcconfig.js')
} catch (e) {
  mc = { prefix: '/__mc'
       , lib: __dirname + '/public/matcha'
       , ajax: __dirname + '/mcajax'
       , test: __dirname + '/mctest' }
}

// Configuration

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
    .use(mc.proxy || proxy.http())

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

app.get('/', routes.index);

io = io.listen(app)
app.listen(8088);

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

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
