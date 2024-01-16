import { createStitches } from '@jujst/stitches/core';
import { describe, expect, test } from 'vitest';

describe('Polyfill prefixed values', () => {
  test('width:stretch', () => {
    const { globalCss, toString } = createStitches();

    globalCss({
      '.gro': {
        width: 'stretch',
      },
    })();

    expect(toString()).toBe(
      '--sxs{--sxs:1 coIeei}@layer global{.gro{width:-moz-available;width:-webkit-fill-available}}',
    );
  });

  test('width:fit-content', () => {
    const { globalCss, toString } = createStitches();

    globalCss({
      '.fit': {
        width: 'fit-content',
      },
    })();

    expect(toString()).toBe(
      '--sxs{--sxs:1 gZsLvv}@layer global{.fit{width:-moz-fit-content;width:fit-content}}',
    );
  });
});
