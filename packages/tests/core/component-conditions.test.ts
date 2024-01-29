import { createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Component Medias', () => {
  test('Authors can define medias applied to components', () => {
    const { css, toString } = createSutairu({
      media: {
        mediumUp: '(width >= 768px)',
      },
    });

    css({
      fontSize: '16px',
      '@mediumUp': {
        fontSize: '24px',
      },
    })();

    expect(toString()).toBe(
      '--sxs{--sxs:2 c-jEGvho}@layer styled{' +
        '.c-jEGvho{font-size:16px}' +
        '@media (min-width:768px){.c-jEGvho{font-size:24px}}' +
        '}',
    );
  });
});
