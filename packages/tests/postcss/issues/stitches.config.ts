import { createStitches } from '../../../stitches/src/core';

const { createTheme } = createStitches({
  theme: {
    colors: {
      red: 'tomato',
    },
  },
});

export const theme = createTheme({
  colors: {
    red: 'tomato',
  },
});
