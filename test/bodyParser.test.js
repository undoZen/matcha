var connect = require('connect')
  , proxy = require('../proxy/')
  , request = require('request')
  , assert = require('assert')
  ;

var app = connect( proxy.prepare
                 , proxy.bodyParser()
                 );

app.use(function(req, res){
  res.end(JSON.stringify(req.body));
});

app.listen(8123);

describe('connect.bodyParser()', function(){
  it('should default to {}', function(done){
    request('http://localhost:8123/', function(err, res, body){
      assert(body === '{}');
      done();
    });
  })

  it('should parse JSON', function(done){
    request({
        method: 'POST'
      , url: 'http://localhost:8123/'
      , headers: { 'Content-Type': 'application/json' }
      , body: '{"user":"tobi"}'
    },
    function(err, res, body){
      assert(body === '{"user":"tobi"}');
      done();
    });
  })

  it('should parse x-www-form-urlencoded', function(done){
    request({
        method: 'POST'
      , url: 'http://localhost:8123/'
      , headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      , body: 'user=tobi'
    }
    , function(err, res, body){
      assert(body === '{"user":"tobi"}');
      done();
    });
  })
});
