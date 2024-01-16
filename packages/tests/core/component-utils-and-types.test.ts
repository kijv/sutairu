import { describe, expect, test } from 'vitest';
import { PropertyValue, createStitches } from '../../stitches/src/core';

describe('Component: Utilities & Tokens', () => {
  test('Utilities & Tokens of the same type', () => {
    const { css, toString } = createStitches({
      utils: {
        px: (value: PropertyValue<'paddingLeft'>) => ({
          paddingLeft: value,
          paddingRight: value,
        }),
      },
    });

    css({
      px: 15,
    })();

    expect(toString()).toBe(
      '--sxs{--sxs:2 c-ccgTVz}@layer styled{.c-ccgTVz{padding-left:15px;padding-right:15px}}',
    );
  });

  test('Utilities & Tokens of different types', () => {
    const { css, toString } = createStitches({
      utils: {
        ftw: (value: PropertyValue<'color'>) => ({
          color: value,
          paddingLeft: value,
          paddingRight: value,
        }),
      },
    });

    css({
      ftw: '$sp',
    })();

    expect(toString()).toBe(
      '--sxs{--sxs:2 c-ilqzId}@layer styled{.c-ilqzId{color:var(--colors-sp);padding-left:var(--space-sp);padding-right:var(--space-sp)}}',
    );
  });
});
