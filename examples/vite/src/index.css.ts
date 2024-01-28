import { globalCss } from '../sutairu.config';

export const globals = globalCss({
  ':root': {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    lineHeight: 1.5,
    fontWeight: 400,

    colorScheme: 'light dark',
    color: 'rgba(255, 255, 255, 0.87)',
    backgroundColor: '#242424',

    fontSynthesis: 'none',
    textRendering: 'optimizeLegibility',
    WebkitFontSmoothing: 'antialiased',
    MozOsxFontSmoothing: 'grayscale',
    WebkitTextSizeAdjust: '100%',
  },
  a: {
    fontWeight: 500,
    color: '#646cff',
    textDecoration: 'inherit',
    '&:hover': {
      color: '#535bf2',
    },
  },
  body: {
    margin: 0,
    display: 'flex',
    placeItems: 'center',
    minWidth: 320,
    minHeight: '100vh',
  },
  h1: {
    fontSize: '3.2em',
    lineHeight: 1.1,
  },
  button: {
    borderRadius: 8,
    border: '1px solid transparent',
    padding: '0.6em 1.2em',
    fontSize: '1em',
    fontWeight: 500,
    fontFamily: 'inherit',
    backgroundColor: '#1a1a1a',
    cursor: 'pointer',
    transition: 'border-color 0.25s',

    '&:hover': {
      borderColor: '#646cff',
    },
    '&:focus, &:focus-visible': {
      outline: '4px auto -webkit-focus-ring-color',
    },
  },
  '@light': {
    ':root': {
      color: '#213547',
      backgroundColor: '#ffffff',
    },
    'a:hover': {
      color: '#747bff',
    },
    button: {
      backgroundColor: '#f9f9f9',
    },
  },
});
