import { createSutairu } from '@sutairu/core';

export const { css, globalCss, keyframes, getCssText, theme, createTheme } =
  createSutairu({
    media: {
      'motion-no-pref': '(prefers-reduced-motion: no-preference)',
      light: '(prefers-color-scheme: light)',
    },
    root: false,
  });
