// Node v4 requires "use strict" to allow block scoped let & const
"use strict";

var webpack = require("webpack");

describe("basic tests: HMR", function () {
    var path = require("path");

    var utils = require("./utils"),
        runSourceTest = utils.runSourceTest;

    var fs;

    var requiredCss = ".required { color: blue }",
        requiredCssTwo = ".requiredTwo { color: cyan }",
        localScopedCss = ":local(.className) { background: red; }",
        localComposingCss = `
      :local(.composingClass) {
        composes: className from './localScoped.css';
        color: blue;
      }
    `,
        existingStyle = `<style id="existing-style">.existing { color: yellow }</style>`,
        checkValue = '<div class="check">check</div>',
        rootDir = path.resolve(__dirname + "/../") + "/",
        jsdomHtml = [
            "<html>",
            "<head id='head'>",
            existingStyle,
            "</head>",
            "<body>",
            "<div class='target'>",
            checkValue,
            "</div>",
            "<iframe class='iframeTarget'/>",
            "</body>",
            "</html>"
        ].join("\n"),
        requiredJS = [
            "var el = document.createElement('div');",
            "el.id = \"test-shadow\";",
            // "var shadow = el.attachShadow({ mode: 'open' })", // sadly shadow dom not working in jsdom
            "document.body.appendChild(el)",
            "var css = require('./style.css');",
        ].join("\n");

    var styleLoaderOptions = {};
    var cssRule = {};

    var defaultCssRule = {
        test: /\.css?$/,
        use: [{
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
        },
        optimization: {
            minimize: false
        },
        plugins: [new webpack.HotModuleReplacementPlugin()]
    };

    var setupWebpackConfig = function () {
        fs = utils.setup(webpackConfig, jsdomHtml);

        // Create a tiny file system. rootDir is used because loaders are referring to absolute paths.
        fs.mkdirpSync(rootDir);
        fs.writeFileSync(rootDir + "main.js", requiredJS);
        fs.writeFileSync(rootDir + "style.css", requiredCss);
        fs.writeFileSync(rootDir + "styleTwo.css", requiredCssTwo);
        fs.writeFileSync(rootDir + "localScoped.css", localScopedCss);
        fs.writeFileSync(rootDir + "localComposing.css", localComposingCss);
    };

    beforeEach(function () {
        // Reset all style-loader options
        for (var member in styleLoaderOptions) {
            delete styleLoaderOptions[member];
        }

        for (var member in defaultCssRule) {
            cssRule[member] = defaultCssRule[member];
        }

        setupWebpackConfig();
    }); // before each

    it("should output HMR code block by default", function (done) {
        runSourceTest(/module\.hot\.accept/g, null, done);
    });

    it("should output HMR code block when options.hmr is true", function (done) {
        styleLoaderOptions.hmr = true;
        setupWebpackConfig();
        runSourceTest(/module\.hot\.accept/g, null, done);
    });

    it("should not output HMR code block when options.hmr is false", function (done) {
        styleLoaderOptions.hmr = false;
        setupWebpackConfig();
        runSourceTest(null, /module\.hot\.accept/g, done);
    });
});
