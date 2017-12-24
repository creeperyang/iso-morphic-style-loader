var StyleElement = require("./styleElement")

var memoize = function(fn) {
  var memo;

  return function() {
    if (typeof memo === "undefined") memo = fn.apply(this, arguments);
    return memo;
  };
};

var isOldIE; // IE <= 9
var flagAttr = "data-universal";
var flagAttrValue = "ssr";
// Used during server side to store loaded style.
var serverStyles = [];
// Indicate whether a style processed.
var stylesInDom = {};
var singleton = null;
var singletonCounter = 0;
var getElement;
var stylesInsertedAtTop = [];
var fixUrls;

function noop() {}

/**
 * Ignored options: options.insertInto | options.insertAt
 */
module.exports = function(list, options) {
  options = options || {};

  options.attrs = typeof options.attrs === "object" ? options.attrs : {};

  var styles = listToStyles(list, options);

  // reset
  noop.__universal__ = undefined;

  // If in server env, export styles to global if user want to inject to html.
  if (typeof window !== "object" || !window.document) {
    isOldIE = memoize(function() {
      if (typeof navigator === "object" && navigator.userAgent) {
        return /MSIE [5-9]\b/i.test(navigator.userAgent);
      }
      return false;
    });
    if (!options.singleton) options.singleton = isOldIE();
    return handleStylesForSsr(styles, options);
  } else {
    isOldIE = memoize(function() {
      return window && document && document.all && !window.atob;
    });
  }

  // Now in browser side, do almost the same as original style-loader.
  if (!options.singleton) options.singleton = isOldIE();
  // By default, add <style> tags to the <head> element
  if (!options.insertInto) options.insertInto = "head";

  // By default, add <style> tags to the bottom of the target
  if (!options.insertAt) options.insertAt = "bottom";

  fixUrls = require("./urls");
  getElement = (function(fn) {
    var memo = {};

    return function(selector) {
      if (typeof memo[selector] === "undefined") {
        var styleTarget = fn.call(this, selector);
        // Special case to return head of iframe instead of iframe itself
        if (styleTarget instanceof window.HTMLIFrameElement) {
          try {
            // This will throw an exception if access to iframe is blocked
            // due to cross-origin restrictions
            styleTarget = styleTarget.contentDocument.head;
          } catch (e) {
            styleTarget = null;
          }
        }
        memo[selector] = styleTarget;
      }
      return memo[selector]
    };
  })(function(target) {
    return document.querySelector(target)
  });

  addStylesToDom(styles, options);

  // Check if has the same style inserted by server, and remove it.
  setTimeout(cleanDomStyles, 16);

  return function update(newList) {
    var mayRemove = [];

    for (var i = 0; i < styles.length; i++) {
      var item = styles[i];
      var domStyle = stylesInDom[item.id];

      domStyle.refs--;
      mayRemove.push(domStyle);
    }

    if (newList) {
      var newStyles = listToStyles(newList, options);
      addStylesToDom(newStyles, options);
    }

    for (var i = 0; i < mayRemove.length; i++) {
      var domStyle = mayRemove[i];

      if (domStyle.refs === 0) {
        for (var j = 0; j < domStyle.parts.length; j++) domStyle.parts[j]();

        delete stylesInDom[domStyle.id];
      }
    }
  };
};

function cleanDomStyles() {
  var allStyles = [].slice.call(document.getElementsByTagName("style"), 0);
  var item;
  for (var i = 0; i < allStyles.length; i++) {
    item = allStyles[i];
    if (item.getAttribute(flagAttr) === flagAttrValue) {
      item.parentNode.removeChild(item);
    }
  }
}

function handleStylesForSsr(styles, options) {
  for (var i = 0; i < styles.length; i++) {
    var item = styles[i];
    for (var j = 0; j < item.parts.length; j++) {
      addUniversalStyle(item.parts[j], options, item.id);
    }
  }

  // Export for ssr.
  noop.__universal__ = serverStyles;
  return noop;

  function addUniversalStyle(obj, options, id) {
    var style, result;

    // Do transform, and if return null, it means we should ignore this style.
    if (options.transform && obj.css) {
      result = options.transform(obj.css);
      if (result) {
        obj.css = result;
      } else {
        return noop;
      }
    }

    // Set attrs.type to `text/css`.
    options.attrs.type = "text/css";
    // Indicate that the style is insetred during ssr time.
    options.attrs[flagAttr] = flagAttrValue;

    if (options.singleton) {
      var styleIndex = singletonCounter++;
      options.attrs["data-singleton"] = "singleton";
      style = singleton || (singleton = createStyle(options, id));
      style.content.splice(styleIndex, 1, obj.css);
      if (serverStyles.indexOf(style) === -1) {
        serverStyles.push(style);
      }
    } else {
      style = createStyle(options, id);
      style.content.push(obj.css)
      if (obj.media) {
        style.setAttribute("media", obj.media)
      }
      serverStyles.push(style);
    }

    return noop;
  }

  function createStyle(options, id) {
    var style = new StyleElement(id);
    Object.keys(options.attrs).forEach(function(key) {
      style.setAttribute(key, options.attrs[key]);
    });
    return style;
  }
}

/// Used by both side.
function listToStyles(list, options) {
  var styles = [];
  var newStyles = {};

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var css = item[1];
    var media = item[2];
    var sourceMap = item[3];
    var part = {
      css: css,
      media: media,
      sourceMap: sourceMap
    };

    if (!newStyles[id]) styles.push(newStyles[id] = {
      id: id,
      parts: [part]
    });
    else newStyles[id].parts.push(part);
  }

  return styles;
}

/// Functions from original addStyles.js, only used by browser side.
function addStylesToDom(styles, options) {
  for (var i = 0; i < styles.length; i++) {
    var item = styles[i];
    var domStyle = stylesInDom[item.id];

    if (domStyle) {
      domStyle.refs++;

      for (var j = 0; j < domStyle.parts.length; j++) {
        domStyle.parts[j](item.parts[j]);
      }

      for (; j < item.parts.length; j++) {
        domStyle.parts.push(addStyle(item.parts[j], options));
      }
    } else {
      var parts = [];

      for (var j = 0; j < item.parts.length; j++) {
        parts.push(addStyle(item.parts[j], options));
      }

      stylesInDom[item.id] = {
        id: item.id,
        refs: 1,
        parts: parts
      };
    }
  }
}

function insertStyleElement(options, style) {
  var target = getElement(options.insertInto)

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");
  }

  var lastStyleElementInsertedAtTop = stylesInsertedAtTop[stylesInsertedAtTop.length - 1];

  if (options.insertAt === "top") {
    if (!lastStyleElementInsertedAtTop) {
      target.insertBefore(style, target.firstChild);
    } else if (lastStyleElementInsertedAtTop.nextSibling) {
      target.insertBefore(style, lastStyleElementInsertedAtTop.nextSibling);
    } else {
      target.appendChild(style);
    }
    stylesInsertedAtTop.push(style);
  } else if (options.insertAt === "bottom") {
    target.appendChild(style);
  } else {
    throw new Error("Invalid value for parameter 'insertAt'. Must be 'top' or 'bottom'.");
  }
}

function removeStyleElement(style) {
  if (style.parentNode === null) return false;
  style.parentNode.removeChild(style);

  var idx = stylesInsertedAtTop.indexOf(style);
  if (idx >= 0) {
    stylesInsertedAtTop.splice(idx, 1);
  }
}

function createStyleElement(options) {
  var style = document.createElement("style");

  options.attrs.type = "text/css";

  addAttrs(style, options.attrs);
  insertStyleElement(options, style);

  return style;
}

function createLinkElement(options) {
  var link = document.createElement("link");

  options.attrs.type = "text/css";
  options.attrs.rel = "stylesheet";

  addAttrs(link, options.attrs);
  insertStyleElement(options, link);

  return link;
}

function addAttrs(el, attrs) {
  Object.keys(attrs).forEach(function(key) {
    el.setAttribute(key, attrs[key]);
  });
}

function addStyle(obj, options) {
  var style, update, remove, result;

  // If a transform function was defined, run it on the css
  if (options.transform && obj.css) {
    result = options.transform(obj.css);

    if (result) {
      // If transform returns a value, use that instead of the original css.
      // This allows running runtime transformations on the css.
      obj.css = result;
    } else {
      // If the transform function returns a falsy value, don't add this css.
      // This allows conditional loading of css
      return function() {};
    }
  }

  if (options.singleton) {
    var styleIndex = singletonCounter++;

    style = singleton || (singleton = createStyleElement(options));

    update = applyToSingletonTag.bind(null, style, styleIndex, false);
    remove = applyToSingletonTag.bind(null, style, styleIndex, true);

  } else if (
    obj.sourceMap &&
    typeof URL === "function" &&
    typeof URL.createObjectURL === "function" &&
    typeof URL.revokeObjectURL === "function" &&
    typeof Blob === "function" &&
    typeof btoa === "function"
  ) {
    style = createLinkElement(options);
    update = updateLink.bind(null, style, options);
    remove = function() {
      removeStyleElement(style);

      if (style.href) URL.revokeObjectURL(style.href);
    };
  } else {
    style = createStyleElement(options);
    update = applyToTag.bind(null, style);
    remove = function() {
      removeStyleElement(style);
    };
  }

  update(obj);

  return function updateStyle(newObj) {
    if (newObj) {
      if (
        newObj.css === obj.css &&
        newObj.media === obj.media &&
        newObj.sourceMap === obj.sourceMap
      ) {
        return;
      }

      update(obj = newObj);
    } else {
      remove();
    }
  };
}

var replaceText = (function() {
  var textStore = [];

  return function(index, replacement) {
    textStore[index] = replacement;

    return textStore.filter(Boolean).join("\n");
  };
})();

function applyToSingletonTag(style, index, remove, obj) {
  var css = remove ? "" : obj.css;

  if (style.styleSheet) {
    style.styleSheet.cssText = replaceText(index, css);
  } else {
    var cssNode = document.createTextNode(css);
    var childNodes = style.childNodes;

    if (childNodes[index]) style.removeChild(childNodes[index]);

    if (childNodes.length) {
      style.insertBefore(cssNode, childNodes[index]);
    } else {
      style.appendChild(cssNode);
    }
  }
}

function applyToTag(style, obj) {
  var css = obj.css;
  var media = obj.media;

  if (media) {
    style.setAttribute("media", media)
  }

  if (style.styleSheet) {
    style.styleSheet.cssText = css;
  } else {
    while (style.firstChild) {
      style.removeChild(style.firstChild);
    }

    style.appendChild(document.createTextNode(css));
  }
}

function updateLink(link, options, obj) {
  var css = obj.css;
  var sourceMap = obj.sourceMap;

  /*
  	If convertToAbsoluteUrls isn't defined, but sourcemaps are enabled
  	and there is no publicPath defined then lets turn convertToAbsoluteUrls
  	on by default.  Otherwise default to the convertToAbsoluteUrls option
  	directly
  */
  var autoFixUrls = options.convertToAbsoluteUrls === undefined && sourceMap;

  if (options.convertToAbsoluteUrls || autoFixUrls) {
    css = fixUrls(css);
  }

  if (sourceMap) {
    // http://stackoverflow.com/a/26603875
    css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
  }

  var blob = new Blob([css], {
    type: "text/css"
  });

  var oldSrc = link.href;

  link.href = URL.createObjectURL(blob);

  if (oldSrc) URL.revokeObjectURL(oldSrc);
}
