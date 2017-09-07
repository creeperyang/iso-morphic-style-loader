// Node v4 requires "use strict" to allow block scoped let & const
"use strict";

var path = require("path");
var vm = require("vm");
var assert = require("assert");

describe("universal tests", function() {
  var utils = require("./utils"),
    runCompilerTest = utils.runCompilerTest;

  var fs;

  var requiredCss = ".required { color: blue }",
    requiredCssTwo = ".requiredTwo { color: cyan }",
    rootDir = path.resolve(__dirname + "/../") + "/";

  var styleLoaderOptions = {};
  var cssRule = {};

  var defaultCssRule = {
    test: /\.css?$/,
    use: [
      {
        loader: "style-loader",
        options: styleLoaderOptions
      },
      "css-loader"
    ]
  };

  var webpackConfig = {
    entry: "./main.js",
    output: {
      filename: "bundle.js"
    },
    module: {
      rules: [cssRule]
    }
  };

  var sandbox = {};
  var context = new vm.createContext(sandbox);
  var expectedAttrs = { type: "text/css", "data-universal": "ssr" };

  beforeEach(function() {
    // Reset all style-loader options
    for (var member in styleLoaderOptions) {
      delete styleLoaderOptions[member];
    }

    for (var member in defaultCssRule) {
      cssRule[member] = defaultCssRule[member];
    }

    fs = utils.setup(webpackConfig);

    // Create a tiny file system. rootDir is used because loaders are refering to absolute paths.
    fs.mkdirpSync(rootDir);
    fs.writeFileSync(rootDir + "main.js", "var css = require('./style.css');");
    fs.writeFileSync(rootDir + "style.css", requiredCss);
    fs.writeFileSync(rootDir + "styleTwo.css", requiredCssTwo);
  }); // before each

  it("normal", function(done) {
    runCompilerTest(null, null, null, function(js) {
      var script = new vm.Script(js);
      script.runInContext(context);
      sandbox.__universal__.forEach(function(v) {
        assert.equal(v.content.join(''), requiredCss);
        assert.deepEqual(v.attrs, expectedAttrs);
      })
      done();
    });
  });

  it("singleton", function(done) {
    // Setup
    styleLoaderOptions.singleton = true;

    fs.writeFileSync(
      rootDir + "main.js",
      [
        "var a = require('./style.css');",
        "var b = require('./styleTwo.css');"
      ].join("\n")
    );

    // Run
    expectedAttrs["data-singleton"] = "singleton";

    runCompilerTest(null, null, null, function(js) {
      var script = new vm.Script(js);
      script.runInContext(context);
      sandbox.__universal__.forEach(function(v) {
        assert.equal(v.content.join(''), requiredCss + requiredCssTwo);
        assert.deepEqual(v.attrs, expectedAttrs);
      })
      done();
    });
  });

  it("singleton by set userAgent", function(done) {
    // Setup
    styleLoaderOptions.singleton = false;
    sandbox.navigator = {
      userAgent: "msie 9.0"
    };

    fs.writeFileSync(
      rootDir + "main.js",
      [
        "var a = require('./style.css');",
        "var b = require('./styleTwo.css');"
      ].join("\n")
    );

    // Run
    runCompilerTest(null, null, null, function(js) {
      var script = new vm.Script(js);
      script.runInContext(context);
      sandbox.__universal__.forEach(function(v) {
        assert.equal(v.content.join(''), requiredCss + requiredCssTwo);
        assert.deepEqual(v.attrs, expectedAttrs);
      })
      done();
    });
  });

}); // describe
