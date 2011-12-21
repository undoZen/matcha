$('<div id="mocha"/>').appendTo('body')
mocha.setup('bdd')
function assert(expr, msg) {
  if (!expr) throw new Error(msg || 'failed');
}
describe('durations', function(){
  describe('when slow', function(){
    it('should highlight in red', function(done){
      setTimeout(done, 100);
    })
  })
  
  describe('when reasonable', function(){
    it('should highlight in yellow', function(done){
      setTimeout(done, 50);
    })
  })
  
  describe('when fast', function(){
    it('should highlight in green', function(done){
      setTimeout(done, 10);
    })
  })
})

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
