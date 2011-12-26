$('<div id="mocha"/>').appendTo('body')
mocha.setup('bdd')
function assert(expr, msg) {
  if (!expr) throw new Error(msg || 'failed');
}

(function() {
  var _onload = window.onload
  window.onload = function() {
    _onload && _onload.call(window)
    var runner = mocha.run();
    'start,suite,suite end,test,pending,pass,fail,end'
      .split(',')
      .forEach(function(ev) {
        runner.on(ev, function() {
          var test = arguments[0]
            , title = test && test.title
            , err = test && test.err
          //console.log(ev);
          //console.log(test);
          //console.log(err);
          test
            ? socket.emit(ev, title)
            : socket.emit(ev)
        })
      })
  }
}());
