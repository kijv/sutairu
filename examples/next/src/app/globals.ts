import { globalCss } from '@/sutairu.config';

export const globals = globalCss({
  '*': {
    boxSizing: 'border-box',
    padding: 0,
    margin: 0,
  },
  'html, body': {
    maxWidth: '100vw',
    overflowX: 'hidden',
  },
  body: {
    color: '$foreground',
    background:
      'linear-gradient(to bottom, transparent, $backgroundEnd) $backgroundStart',
  },
  a: {
    color: 'inherit',
    textDecoration: 'none',
  },
  '@dark': {
    ':root': {
      '--colors-foreground': '#fff',
      '--colors-backgroundStart': '#000',
      '--colors-backgroundEnd': '#000',

      '--colors-primaryGlow':
        'radial-gradient(rgba(1, 65, 255, 0.4), rgba(1, 65, 255, 0))',
      '--colors-secondaryGlow':
        'linear-gradient(to bottom right, rgba(1, 65, 255, 0), rgba(1, 65, 255, 0), rgba(1, 65, 255, 0.3))',

      '--colors-titleStartRgb': '239, 245, 249',
      '--colors-titleEndRgb': '228, 232, 233',
      '--colors-titleBorder':
        'conic-gradient(#ffffff80, #ffffff40, #ffffff30, #ffffff20, #ffffff10, #ffffff10, #ffffff80)',

      '--colors-calloutRgb': '20, 20, 20',
      '--colors-calloutBorderRgb': '108, 108, 108',
      '--colors-cardRgb': '100, 100, 100',
      '--colors-cardBorderRgb': '200, 200, 200',
    },
    html: {
      colorScheme: 'dark',
    },
  },
});
