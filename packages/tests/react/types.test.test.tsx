import type * as Stitches from '@sutairu/react';
import { type FontFace, createSutairu } from '@sutairu/react';
// biome-ignore lint/nursery/useImportType: Needed for this test
import * as React from 'react';
import { assertType, suite, test } from 'vitest';
import type { CSS } from '../../core/types/css-util';

suite('Types', () => {
  const { css, globalCss, keyframes, styled, theme } = createSutairu({
    utils: {
      mx: (value: Stitches.PropertyValue<'marginLeft'>) => ({
        marginLeft: value,
        marginRight: value,
      }),
    },
    theme: {
      colors: {
        hiContrast: 'hsl(200, 12%, 5%)',
        loContrast: 'white',
        gray100: 'hsl(206, 20%, 98.8%)',
        gray200: 'hsl(206, 14%, 96.0%)',
        gray300: 'hsl(206, 13%, 93.7%)',
        gray400: 'hsl(206, 12%, 92.0%)',
        gray500: 'hsl(206, 12%, 89.5%)',
        gray600: 'hsl(206, 11%, 85.2%)',
        gray700: 'hsl(206, 10%, 80.0%)',
        gray800: 'hsl(206, 6%, 56.1%)',
        gray900: 'hsl(206, 6%, 43.9%)',
        pedro: '$gray100',
      },
      space: {
        1: '10px',
        2: '20px',
      },
      fontSizes: {
        '1': '11px',
        '2': '13px',
        '3': '15px',
        '4': '17px',
        '5': '19px',
        '6': '21px',
        '7': '27px',
        '8': '35px',
        '9': '59px',
      },
    },
    media: {
      bp1: '(min-width: 620px)',
    },
  });

  keyframes({
    from: {
      color: '$gray100',
    },
    to: {
      color: '$gray900',
    },
  });

  globalCss({
    body: {
      backgroundColor: '$gray300',
      '@bp1': {
        backgroundColor: '$gray100',
      },
    },
  });

  test('General Types', () => {
    assertType<CSS<typeof css>>({
      '@bp1': {
        backgroundColor: '$gray100',
      },
      backgroundColor: '$gray300',
    });

    const PotatoButton = styled('button', {
      variants: {
        peace: {
          mercy: {
            color: 'MediumOrchid',
          },
          trust: {
            color: 'Turquoise',
          },
        },
        hue: {
          blue: {
            backgroundColor: '$gray100',
          },
          red: {
            backgroundColor: '$gray100',
          },
        },
      },
      compoundVariants: [
        {
          hue: 'blue',
          css: {
            backgroundColor: '$gray200',
          },
        },
      ],
    });

    assertType<() => ReturnType<typeof PotatoButton>>(() => {
      return <PotatoButton peace="mercy" hue="blue" />;
    });

    const ExtendedButton = styled(PotatoButton, {
      width: '$$max',
      variants: {
        hue: {
          green: {
            width: '$$max',
            backgroundColor: '$gray100',
          },
          red: {
            backgroundColor: '$gray100',
          },
        },
        love: {
          free: {
            color: 'ForestGreen',
          },
          good: {
            color: 'GoldenRod',
          },
        },
      },
      defaultVariants: {
        hue: 'red',
      },
      compoundVariants: [
        {
          hue: 'green',
          css: {
            backgroundColor: '$gray200',
          },
        },
      ],
    });

    assertType<() => ReturnType<typeof ExtendedButton>>(() => {
      return <ExtendedButton peace="mercy" love="free" hue="red" />;
    });

    assertType<() => ReturnType<typeof PotatoButton>>(() => {
      return (
        <PotatoButton
          css={{
            backgroundColor: '$gray300',

            '@all': {
              backgroundColor: 'initial',
            },

            '@bp1': {
              backgroundColor: 'initial',
            },
          }}
        />
      );
    });
  });

  test('Issue #821', () => {
    type UnionProps =
      | { type: 'single'; collapsible: boolean }
      | { type: 'multiple' };
    const UnionComponent: React.FC<UnionProps> = () => null;
    const StyledUnionComponent = styled(UnionComponent, {});

    assertType<
      ReturnType<typeof StyledUnionComponent> & {
        collapsible?: boolean | undefined;
      }
      // @ts-expect-error
    >(<StyledUnionComponent type="single" collapsible />);
  });

  test('Issue #1010', () => {
    const fontFaceArray: FontFace[] = [
      {
        fontFamily: 'Inter',
        src: `url(file.woff2) format("woff2")`,
        fontDisplay: 'swap',
      },
    ];
    const styles = {
      '@font-face': fontFaceArray,
      body: {
        // Falbacking to a serif font so it's easier to see that the swap is hapenning
        fontFamily: 'Inter, serif',
      },
    };
    void function Test() {
      globalCss(styles);
    };
  });
});
