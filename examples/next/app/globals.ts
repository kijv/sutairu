import { globalCss } from '@/stitches.config';

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
    html: {
      colorScheme: 'dark',
    },
  },
});
