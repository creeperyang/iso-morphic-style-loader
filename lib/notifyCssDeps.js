var PropTypes = require('prop-types');

module.exports = notify;

function notify () {
  var args = [].slice.call(arguments, 0).map(function(v) {
    return v.__universal__;
  });
  return function decorator (target) {
    var originalWillMount = target.prototype.componentWillMount;

    target.prototype.componentWillMount = originalWillMount ? function () {
      if (this.context.iterateCss) {
        this.context.iterateCss.apply(undefined, args);
      }
      return originalWillMount.apply(this, arguments);
    } : function () {
      if (this.context.iterateCss) {
        this.context.iterateCss.apply(undefined, args);
      }
    };

    if (!target.contextTypes) {
      target.contextTypes = {};
    }
    target.contextTypes.iterateCss = PropTypes.func;

    return target;
  }
}
