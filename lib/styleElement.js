function StyleElement (id) {
  this.id = id;
  this.content = [];
  this.attrs = {};
}

StyleElement.prototype.setAttribute = function (key, value) {
  if (value == null) {
    delete this.attrs[key];
  } else {
    this.attrs[key] = value;
  }
}

StyleElement.prototype.toString = function (connector) {
  var content = this.content.join(connector == null ? '\n' : connector);
  var attrStr = '';
  var attrs = this.attrs;

  Object.keys(this.attrs).forEach(function (v) {
    attrStr += v + '="' + attrs[v] + '" ';
  });
  if (attrStr.length > 0) {
    attrStr = ' ' + attrStr.slice(0, -1);
  }
  return '<style' + attrStr + '>' + content + '</style>';
}

module.exports = StyleElement;
