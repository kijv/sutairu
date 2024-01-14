import { CSS, PropertyValue, createStitches } from '../../src/core';

test('Issue #921', () => {
  const config = {
    utils: {
      background: (value: boolean | PropertyValue<'background'>) => {
        if (typeof value === 'boolean') {
          return value
            ? {
                background: 'red',
              }
            : {};
        }
        return {
          background: value,
        };
      },
    },
  };

  const { css, globalCss } = createStitches(config);

  expectTypeOf(
    globalCss({
      html: {
        background: true,
      },
      body: {
        background: 'green',
      },
    }),
  ).toBeFunction();

  const Component = css({
    background: true,
    '> *': {
      background: 'green',
    },
  });

  expectTypeOf(Component).toBeFunction();

  expectTypeOf(
    Component({
      background: 'green',
      '> *': {
        background: true,
      },
    }),
  ).toMatchTypeOf<ReturnType<ReturnType<typeof css>>>();

  expectTypeOf(
    css(Component, {
      background: 'green',
    }),
  ).toBeFunction();

  expectTypeOf(
    css(Component, {
      background: true,
    }),
  ).toBeFunction();

  const style: CSS = {
    // @ts-expect-error
    background: true,
  };

  expectTypeOf(style).toMatchTypeOf<CSS>();

  const style2: CSS<typeof config> = {
    background: true,
  };

  expectTypeOf(style2).toMatchTypeOf<CSS<typeof config>>();

  const style3: CSS<typeof config> = {
    background: 'green',
  };

  expectTypeOf(style3).toMatchTypeOf<CSS<typeof config>>();
});
