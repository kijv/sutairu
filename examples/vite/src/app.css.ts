import { css, keyframes } from '../sutairu.config';

export const root = css({
  maxWidth: '1280px',
  margin: '0 auto',
  padding: '2rem',
  textAlign: 'center',
});

export const logoSpin = keyframes({
  from: {
    transform: 'rotate(0deg)',
  },
  to: {
    transform: 'rotate(360deg)',
  },
});

export const logo = css({
  height: '6em',
  padding: '1.5em',
  willChange: 'filter',
  transition: 'filter 300ms',

  '&:hover': {
    filter: 'drop-shadow(0 0 2em #646cffaa)',
  },

  '@motion-no-pref': {
    'a:nth-of-type(2) &': {
      animation: `${logoSpin} infinite 20s linear`,
    },
  },
});

// TODO fix this bug
export const react = css(logo, {
  '&:hover': {
    filter: 'drop-shadow(0 0 2em #61dafbaa)',
  },
});

export const card = css({
  padding: '2em',
});

export const readTheDocs = css({
  color: '#888',
});
