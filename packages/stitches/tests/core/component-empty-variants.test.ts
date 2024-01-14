import { createStitches } from '../../src/core';

describe('Empty Variants', () => {
  test('Empty Variants', () => {
    const { css, getCssText } = createStitches();

    css({
      variants: {
        size: {
          xl: {},
        },
        tone: {
          primary: {},
        },
      },
      compoundVariants: [
        {
          tone: 'primary',
          size: 'xl',
        },
      ],
    })({
      tone: 'primary',
      size: { '@initial': 'xl' },
    });

    expect(getCssText()).toBe('');
  });

  test('Empty Variants', () => {
    const { css, getCssText } = createStitches();

    css({
      variants: {
        size: {
          xl: {},
        },
        tone: {
          primary: {},
        },
      },
      compoundVariants: [
        {
          tone: 'primary',
          size: 'xl',
          css: { fontSize: '24px', color: 'black' },
        },
      ],
    })({
      tone: 'primary',
      size: { '@initial': 'xl' },
    });

    expect(getCssText()).toBe(
      '--sxs{--sxs:5 c-PJLV-lhHHWD-cv}@layer allvar{' +
        '.c-PJLV-lhHHWD-cv{font-size:24px;color:black}' +
        '}',
    );
  });
});
