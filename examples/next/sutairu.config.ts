import { createSutairu } from '@sutairu/react';

export const {
  styled,
  css,
  globalCss,
  keyframes,
  getCssText,
  theme,
  createTheme,
} = createSutairu({
  media: {
    dark: '(prefers-color-scheme: dark)',
    mobile: '(max-width: 700px)',
    tablet: '(min-width: 701px) and (max-width: 1120px)',
    hover: '(hover: hover) and (pointer: fine)',
    reducedMotion: '(prefers-reduced-motion)',
  },
  theme: {
    colors: {
      foreground: '#000',
      backgroundStart: 'rgb(214, 219, 220)',
      backgroundEnd: '#fff',

      primaryGlow:
        'conic-gradient(from 180deg at 50% 50%, #16abff33 0deg, #0885ff33 55deg, #54d6ff33 120deg, #0071ff33 160deg, transparent 360deg)',
      secondaryGlow:
        'radial-gradient(rgba(255, 255, 255, 1), rgba(255, 255, 255, 0))',

      titleStartRgb: '239, 245, 249',
      titleEndRgb: '228, 232, 233',
      titleBorder:
        'conic-gradient(#00000080, #00000040, #00000030, #00000020, #00000010, #00000010, #00000080)',

      calloutRgb: '238, 240, 241',
      calloutBorderRgb: '172, 175, 176',
      cardRgb: '180, 185, 188',
      cardBorderRgb: '131, 134, 135',
    },
    sizes: {
      maxWidth: '1100px',
    },
    radii: {
      border: '12px',
    },
    fonts: {
      mono: 'ui-monospace, Menlo, Monaco, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", "Oxygen Mono", "Ubuntu Monospace", "Source Code Pro", "Fira Mono", "Droid Sans Mono", "Courier New", monospace',
    },
  },
  root: false,
});
