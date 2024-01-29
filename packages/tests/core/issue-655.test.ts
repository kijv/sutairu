import { createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Issue #655', () => {
  test('Applying both variants from the one default variant', () => {
    const { css, getCssText } = createSutairu();

    css({
      maxWidth: 'fit-content',
      minWidth: 'fit-content',
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-dAAqmb}' +
        '@layer styled{.c-dAAqmb{' +
        'max-width:-moz-fit-content;max-width:fit-content;' +
        'min-width:-moz-fit-content;min-width:fit-content' +
        '}}',
    );
  });
});
