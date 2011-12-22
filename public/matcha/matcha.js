$('<div id="mocha"/>').appendTo('body')
mocha.setup('bdd')
function assert(expr, msg) {
  if (!expr) throw new Error(msg || 'failed');
}

var _onload = window.onload
window.onload = function() {
  _onload && _onload.call(window)

  var runner = mocha.run();

  var evs = 'start,suite,suite end,test,pending,pass,fail,end'.split(',');
  for(var i = -1, ev; ev = evs[++i]; ) {
    (function(ev) {
      runner.on(ev, function() {
        var o = arguments[0]
          , title = o && o.title
        title
          ? socket.emit(ev, title)
          : socket.emit(ev)
      })
    }(ev));
  }

}

