# `@jujst/stitches`

## So what's different?

* 100% backwards compatible with @stitches/core and @stitches/react
* PostCSS plugin to extract CSS on the server (expect some bugs)
* Up to date with CSS spec

## Installation

```sh
npm install @jujst/stitches
```

## PostCSS Plugin

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    '@jujst/stitches/postcss': {}
  }
}
```

```ts
// stitches.config.ts
import { defineConfig } from '@jujst/stitches/config';

const stitches = defineConfig({
  react: /* set this to true to use @stitches/react */
  /* usual stitches config goes here... */
});

// It is important to export the variables 
// like this if you are the PostCSS plugin
export const { css, globalCss, keyframes, getCssText, theme } = stitches;
export default stitches;
```

## Acknowledgements

* PostCSS plugin based on [@unocss/postcss](https://www.npmjs.com/package/@unocss/postcss)

* [Stitches](https://www.npmjs.com/package/@stitches/core) of course

## License

[MIT](https://github.com/jujitsustudio/stitches/blob/main/LICENSE)