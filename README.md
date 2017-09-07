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
// iso-morphic-style-loader will export global.__universal__ and you
// can access it to get styles.
if (global.__universal__) {
  global.__universal__.forEach(v => {
    data.styles.push({
      ...v.attrs,
      id: v.id,
      cssText: v.content.join('\n')
    })
  })
}
// Then we will pass this styles to your React Component.
const html = ReactDOM.renderToStaticMarkup(<Component {...data} />)
res.status(route.status || 200)
res.send(`<!doctype html>${html}`)

///////////

// Here maybe your component.js
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
```

## Features

1. For server side, the lib will export `__universal__` to `global`, and you can access it to get styles.

    `__universal__.forEach(v => console.log(v.id, v.attrs, v.content))`

    `__universal__.map(v => console.log(v.id, v.attrs, v.content))`
  
    Nothing will happens if you ignore `__universal__`, no errors in server side rendering, and works the same as `style-loader` do.

    But if you want to optimize for critical path CSS rendering, please inject styles during server side rendering.

2. The browser side behaviour is exactly the same as `style-loader@0.18.2`. And you can enjoy all features supported by `style-loader@0.18.2`.

3. **No FOUC, no duplicate!**

    1. The script will try to remove the styles injected at server side to prevent duplicate.
    2. However it only remove after client side styles created, so no FOUC.


[npm]: https://img.shields.io/npm/v/iso-morphic-style-loader.svg
[npm-url]: https://npmjs.com/package/iso-morphic-style-loader

[travis]: https://travis-ci.org/creeperyang/iso-morphic-style-loader.svg?branch=master
[travis-url]: https://travis-ci.org/creeperyang/iso-morphic-style-loader

[license]: https://img.shields.io/badge/license-MIT-blue.svg
[license-url]: https://raw.githubusercontent.com/creeperyang/iso-morphic-style-loader/master/LICENSE
