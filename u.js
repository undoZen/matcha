exports = module.exports = {
    extend: function(orig) {
      if (!orig instanceof Object) {
        orig = {};
      }
      Array.prototype.slice.call(arguments, 1).forEach(function (obj) {
        Object.keys(obj || {}).forEach(function (key) {
          orig[key] = obj[key];
        });
      });
      return orig;
    }
  , readAll: function(cb) {
    }
}
