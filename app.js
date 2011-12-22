var express = require('express')
  , connect = require('connect')
  , routes = require('./routes')
  , proxy = require('./lib/proxy')
  , io = require('socket.io')
  , u = require('./lib/u')
  , url = require('url')

var app = module.exports = express.createServer();

var mc
try {
  mc = require('./mcconfig.js')
} catch (e) {
  mc =  { prefix: '/__mc'
        , lib: __dirname + '/public/matcha'
        , ajax: __dirname + '/mcajax'
        , test: __dirname + '/mctest'
        , host: '127.0.0.1'
        , port: 8088 }
}

var proxyHost = function(host) {
  return function (_, req) {
    return !req.url.indexOf(mc.prefix) ? false : host
  }
}

var proxyTamper = function(body, req) {
  var reqUrl = url.parse(req.url, true)
    , tests
    , ajaxs
    , scripts = [ '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js"></script>'
                , '<script src="/socket.io/socket.io.js"></script>'
                , '<script src="' + mc.prefix + '/lib/mocha.js"></script>'
                , '<script src="' + mc.prefix + '/lib/matcha.js"></script>'
                , '<script> var socket = io.connect(\'http://\'+location.hostname); socket.emit(\'ua\', navigator.userAgent); </script>'
                ]
  if (reqUrl.query) {
    tests = (reqUrl.query._mc_test || '').split(',').filter(function(p){return p!==''})
    ajaxs = (reqUrl.query._mc_ajax || '').split(',').filter(function(p){return p!==''})
  }
  if (tests.length) {
    body = body
      .replace('</head>', '\n<link rel="stylesheet" href="' + mc.prefix + '/lib/mocha.css">\n</head>')
    tests.forEach(function(test) {
      if (!/.js$/.test(test)) {
        test = test + '.js';
      }
      scripts.push('<script src="' + mc.prefix + '/test/'+test+'"></script>');
    })
    //scripts.push('<script src="' + mc.prefix + '/lib/mocha_run.js"></script>')
    console.log(scripts.join(''));
    console.log(body);
    body = body.replace('</body>', '\n'+scripts.join('\n')+'\n</body>');
    console.log(body);
  }
  console.log(ajaxs)
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
        return !req.url.indexOf(mc.prefix + '/blank') ? mc.host : false
      }
    , port: mc.port
    , path: function(path) {
        return path.replace(mc.prefix + '/blank', mc.prefix + '/_blank')
      }
    , tamper: proxyTamper
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
    .use(mc.prefix + '/test', express['static'](mc.test))
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
