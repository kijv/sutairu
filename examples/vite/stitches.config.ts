import { defineConfig } from '@jujst/stitches/config';

const stitches = defineConfig({
  media: {
    'motion-no-pref': '(prefers-reduced-motion: no-preference)',
    light: '(prefers-color-scheme: light)',
  },
});

export const { css, globalCss, keyframes, getCssText, theme, createTheme } =
  stitches;
export default stitches;
