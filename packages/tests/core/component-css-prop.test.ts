import { describe, expect, test } from 'vitest';
import { createStitches } from '../../stitches/src/core';

describe('Component with CSS prop', () => {
  test('Authors can create a component and pass it a css prop of overrides', () => {
    const { css, toString } = createStitches({
      media: {
        bp0: '(width < 768px)',
        bp1: '(768px <= width < 1400px)',
        bp2: '(1400px <= width)',
      },
    });

    css({
      order: 1,
    })({
      css: {
        order: 2,
      },
    });

    expect(toString()).toBe(
      '--sxs{--sxs:2 c-hhyRYU}@layer styled{' +
        '.c-hhyRYU{order:1}' +
        '}' +
        '--sxs{--sxs:6 c-hhyRYU-ilhKMMn-css}@layer inline{' +
        '.c-hhyRYU-ilhKMMn-css{order:2}' +
        '}',
    );
  });
});
