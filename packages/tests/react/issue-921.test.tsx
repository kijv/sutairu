import { CSS, PropertyValue, createStitches } from '@jujst/stitches/react';

describe('Issue #921: Fix CSS type for utils overshadowing properties', () => {
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

  const { css, globalCss, styled } = createStitches(config);

  globalCss({
    html: {
      background: true,
    },
    body: {
      background: 'green',
    },
  });

  const CComponent = css({
    background: true,
    '> *': {
      background: 'green',
    },
  });

  CComponent({
    background: 'green',
    '> *': {
      background: true,
    },
  });

  css(CComponent, {
    background: 'green',
  });

  css(CComponent, {
    background: true,
  });

  const SComponent = styled('div', {
    background: 'green',
    '> *': {
      background: true,
    },
  });

  void function Test() {
    return (
      <SComponent
        css={{
          background: true,
          '> *': {
            background: 'green',
          },
        }}
      />
    );
  };

  test('Types are valid', () => {
    assertType<CSS>({
      // @ts-expect-error
      background: true,
    });

    assertType<CSS<typeof config>>({
      background: true,
    });

    assertType<CSS<typeof config>>({
      background: 'green',
    });
  });
});
