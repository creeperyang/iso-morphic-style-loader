[![npm][npm]][npm-url]
[![travis][travis]][travis-url]
[![license][license]][license-url]

<div align="center">
  <a href="https://github.com/webpack/webpack">
    <img width="200" height="200"
      src="https://webpack.js.org/assets/icon-square-big.svg">
  </a>
  <h1>Isomorphic Style Loader</h1>
  <p>The isomorphic style loader based on <a href="https://github.com/webpack-contrib/style-loader">style-loader</a>, work both with server side and browser side.</p>
</div>

<h2 align="center">Install</h2>

```
npm install iso-morphic-style-loader --save-dev
```

<h2 align="center"><a href="https://webpack.js.org/concepts/loaders">Usage</a></h2>

In fact, there is **nothing different** with the [style-loader](https://github.com/webpack-contrib/style-loader), just use **the same config** as you like.

However, some more work if you want to add [critical path CSS](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/) with isomorphic app:


```js
/// Such as server.js, where you render your isomorphic app and will send it
/// back to your user.
data.styles = []
// iso-morphic-style-loader will offer you the way to access imported styles
// via React's context.
const context = {
  // will be invoked when render in server side
  iterateCss: (styles) => {
    styles.forEach(style => {
      data.push({
        ...style.attrs,
        id: style.id,
        cssText: style.content.join('\n')
      })
    })
  },
}
// Then we will pass this styles to your React Component.
const html = ReactDOM.renderToStaticMarkup(<App {...data} />)
res.status(route.status || 200)
res.send(`<!doctype html>${html}`)

///////////

// Here is your App.js
// Perfect, we can insert styles easily.
render() {
  return (
    {styles.map(({id, cssText, ...rest}) =>
      <style
        {...rest}
        key={id}
        id={id}
        dangerouslySetInnerHTML={{ __html: cssText }}
      />
    )}
  )
}

//////////
// And here your component where really import styles
import React from 'react'
import PropTypes from 'prop-types'
import notifyCssDeps from 'iso-morphic-style-loader/lib/notifyCssDeps'
import css from './index.css'
import css2 from './demo.css'

// The decorator will invoke previous iterateCss method when the component get rendered
@notifyCssDeps(css, css2)
class MyComponent extends React.Component {
  render() {}
}
```

## Features

1. For server side, the lib will use React's context to offer you a way to access styles.

    ```js
    iterateCss: (styles) => {
      styles.forEach(style => {
        data.push({
          ...style.attrs,
          id: style.id,
          cssText: style.content.join('\n')
        })
      })
    }
    ```
  
    Nothing will happens if you ignore `iterateCss`, no errors in server side rendering, and works the same as `style-loader` do.

    But if you want to optimize for critical path CSS rendering, please inject styles during server side rendering.

2. The browser side behaviour is exactly the same as `style-loader@0.18.2`. And you can enjoy all features supported by `style-loader@0.18.2`.

3. **No FOUC, no duplicate!**

    1. The script will try to remove the styles injected at server side to prevent duplicate.
    2. However it only remove after client side styles created, so no FOUC.

## Demo

<p align="center">
<img src="https://user-images.githubusercontent.com/8046480/30177575-e41a401a-9438-11e7-91f8-9ce31ce16a1c.gif" alter="normal"/>
<img src="https://user-images.githubusercontent.com/8046480/30177572-e0abe4ec-9438-11e7-8a94-7125075a09d9.gif" alter="iso-morphic-style-loader"/>
</p>

Left is with `style-loader` and right is with `iso-morphic-style-loader`.


[npm]: https://img.shields.io/npm/v/iso-morphic-style-loader.svg
[npm-url]: https://npmjs.com/package/iso-morphic-style-loader

[travis]: https://travis-ci.org/creeperyang/iso-morphic-style-loader.svg?branch=master
[travis-url]: https://travis-ci.org/creeperyang/iso-morphic-style-loader

[license]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://raw.githubusercontent.com/creeperyang/iso-morphic-style-loader/master/LICENSE
