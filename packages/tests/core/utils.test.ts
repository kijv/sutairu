import { type PropertyValue, createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Utils', () => {
  test('Authors can define utilties applied to components', () => {
    const stitches = createSutairu({
      utils: {
        bg: (value: PropertyValue<'backgroundColor'>) => ({
          backgroundColor: value,
        }),
      },
    });

    const component = stitches.css({
      bg: 'red',
    });

    expect(stitches.toString()).toBe('');

    component.toString();

    expect(stitches.toString()).toBe(
      '--sxs{--sxs:2 c-bzwKCF}@layer styled{.c-bzwKCF{background-color:red}}',
    );
  });
});
