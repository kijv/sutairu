# `@jujst/stitches`

## So what's different?

* 100% backwards compatible with @stitches/core and @stitches/react
* PostCSS plugin to extract CSS on the server-side
* Added modern CSS properties

## Installation

```sh
npm install @jujst/stitches
```

## PostCSS

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
  react: /* set this to true to use @stitches/react */,
});

// It is important to export the variables like this
export const { css, globalCss, keyframes, getCssText, theme } = stitches;
export default stitches;
```

## Acknowledgements

* PostCSS plugin based on [@unocss/postcss](https://www.npmjs.com/package/@unocss/postcss)

## License

MIT