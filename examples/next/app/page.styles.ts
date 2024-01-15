import { css, keyframes } from '@/stitches.config';

export const main = css({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '6rem',
  minHeight: '100vh',
});

export const description = css({
  display: 'inherit',
  justifyContent: 'inherit',
  alignItems: 'inherit',
  fontSize: '0.85rem',
  maxWidth: '$maxWidth',
  width: '100%',
  zIndex: 2,
  fontFamily: '$mono',

  '& a': {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.5rem',

    '@mobile': {
      padding: '1rem',
    },
  },
  '& p': {
    position: 'relative',
    margin: 0,
    padding: '1rem',
    backgroundColor: 'rgba($calloutRgb, 0.5)',
    border: '1px solid rgba($calloutBorderRgb, 0.3)',
    borderRadius: '$border',

    '@mobile': {
      alignItems: 'center',
      inset: '0 0 auto',
      padding: '2rem 1rem 1.4rem',
      borderRadius: 0,
      border: 'none',
      borderBottom: '1px solid rgba($calloutBorderRgb, 0.25)',
      background:
        'linear-gradient(to bottom, $backgroundStart, rgba($calloutRgb, 0.5))',
      backgroundClip: 'padding-box',
      backdropFilter: 'blur(24px)',
    },
  },

  '@mobile': {
    fontSize: '0.8rem',

    '& div': {
      alignItems: 'flex-end',
      pointerEvents: 'none',
      inset: 'auto 0 0',
      padding: '2rem',
      height: 200,
      background:
        'linear-gradient(to bottom, transparent 0%, rgba(var(--background-end-rgb), 1) 40%)',
    },

    '& p, & div': {
      display: 'flex',
      justifyContent: 'center',
      position: 'fixed',
      width: '100%',
    },
  },
});

export const code = css({
  fontWeight: 700,
  fontFamily: '$mono',
});

export const grid = css({
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(25%, auto))',
  maxWidth: '100%',
  width: '$maxWidth',

  '@tablet': {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },

  '@mobile': {
    gridTemplateColumns: '1fr',
    marginBottom: 120,
    maxWidth: 320,
    textAlign: 'center',
  },
});

export const card = css({
  padding: '1rem 1.2rem',
  borderRadius: '$border',
  background: 'rgba($cardRgb, 0)',
  border: '1px solid rgba($cardBorderRgb, 0)',
  transition: 'background 200ms, border 200ms',

  '& span': {
    display: 'inline-block',
    transition: 'transform 200ms',
  },

  '& h2': {
    fontWeight: 600,
    marginBottom: '0.7rem',
  },

  '& p': {
    margin: 0,
    opacity: 0.6,
    fontSize: '0.9rem',
    lineHeight: 1.5,
    maxWidth: '30ch',
  },

  '@hover': {
    '&:hover': {
      background: 'rgba($cardRgb, 0.1)',
      border: '1px solid rgba($cardBorderRgb, 0.15)',
    },

    '&:hover span': {
      transform: 'translateX(4px)',
    },
  },

  '@reducedMotion': {
    '&:hover span': {
      transform: 'none',
    },
  },

  '@mobile': {
    padding: '1rem 2.5rem',

    '& h2': {
      marginBottom: '0.5rem',
    },
  },
});

export const center = css({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
  padding: '4rem 0',

  '&::before': {
    background: '$secondaryGlow',
    borderRadius: '50%',
    width: 480,
    height: 360,
    marginLeft: '-400px',
  },

  '&::after': {
    background: '$primaryGlow',
    width: 240,
    height: 180,
    zIndex: '-1',
  },

  '&::before, &::after': {
    content: '',
    left: '50%',
    position: 'absolute',
    filter: 'blur(45px)',
    transform: 'translateZ(0)',
  },

  '@mobile': {
    padding: '8rem 0 6rem',

    '&::before': {
      transform: 'none',
      height: 300,
    },
  },
});

export const logo = css({
  position: 'relative',

  '@dark': {
    filter: 'invert(1) drop-shadow(0 0 0.3rem #ffffff70)',
  },
});

export const vercelLogo = css({
  '@dark': {
    filter: 'invert(1)',
  },
});

export const rotate = keyframes({
  from: {
    transform: 'rotate(360deg)',
  },
  to: {
    transform: 'rotate(0deg)',
  },
});
