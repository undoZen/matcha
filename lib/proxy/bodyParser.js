/*!
 * Connect - bodyParser
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2011 yuest <yuestwang@gmail.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var qs = require('qs');

/**
 * Extract the mime type from the given request's
 * _Content-Type_ header.
 *
 * @param  {IncomingMessage} req
 * @return {String}
 * @api private
 */

function mime(req) {
  var str = req.headers['content-type'] || '';
  return str.split(';')[0];
}

/**
 * Parse request bodies.
 *
 * By default _application/json_, _application/x-www-form-urlencoded_,
 * and _multipart/form-data_ are supported, however you may map `connect.bodyParser.parse[contentType]`
 * to a function receiving `(req, options, callback)`.
 *
 * Examples:
 *
 *      connect.createServer(
 *          connect.bodyParser()
 *        , function(req, res) {
 *          res.end('viewing user ' + req.body.user.name);
 *        }
 *      );
 *
 *      $ curl -d 'user[name]=tj' http://localhost/
 *      $ curl -d '{"user":{"name":"tj"}}' -H "Content-Type: application/json" http://localhost/
 *
 * Multipart configuration:
 *
 *  The `options` passed are provided to each parser function.
 *  The _multipart/form-data_ parser merges these with formidable's
 *  IncomingForm object, allowing you to tweak the upload directory,
 *  size limits, etc. For example you may wish to retain the file extension
 *  and change the upload directory:
 *
 *      server.use(bodyParser({
 *          keepExtensions: true
 *        , uploadDir: '/www/mysite.com/uploads'
 *      }));
 *
 *  View [node-formidable](https://github.com/felixge/node-formidable) for more information.
 *
 *  If you wish to use formidable directly within your app, and do not
 *  desire this behaviour for multipart requests simply remove the
 *  parser: 
 *
 *     delete connect.bodyParser.parse['multipart/form-data'];
 *
 *  Or
 *
 *     delete express.bodyParser.parse['multipart/form-data'];
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

exports = module.exports = function bodyParser(options){
  options = options || {};
  return function bodyParser(req, res, next) {
    if (req.body) return next();
    req.body = {};

    if ('GET' == req.method || 'HEAD' == req.method) return next();
    var parser = exports.parse[mime(req)];
    if (parser) {
      parser(req, options, next);
    } else {
      next();
    }
  }
};

/**
 * Parsers.
 */

exports.parse = {};

['application/x-www-form-urlencoded', 'application/json'].forEach(function(mime){
  exports.parse[mime] = function(req, options, fn){
    var str = '';
    try {
      req.bodyBuffers.forEach(function(buf){
        str += buf.toString('utf-8');
      });
      req.body = (/json$/.test(mime) ? JSON : qs).parse(str);
      fn();
    } catch (err) {
      fn(err);
    }
  };
});
