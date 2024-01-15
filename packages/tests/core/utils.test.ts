import { PropertyValue, createStitches } from '@jujst/stitches/core';

describe('Utils', () => {
  test('Authors can define utilties applied to components', () => {
    const stitches = createStitches({
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
