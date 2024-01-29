import { createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Theme', () => {
  test('Expected behavior for the createTheme() method', () => {
    const { createTheme, getCssText } = createSutairu();

    const myTheme = createTheme('my', {
      colors: {
        blue: 'dodgerblue',
      },
    });

    expect(getCssText()).toBe('');
    expect(`<div class="${myTheme}">`).toBe('<div class="my">');
    expect(getCssText()).toBe(
      '--sxs{--sxs:0 my}@layer themed{.my{--colors-blue:dodgerblue}}',
    );
    expect(myTheme.className).toBe('my');
    expect(myTheme.selector).toBe('.my');
  });

  test('createTheme() support for non-strings', () => {
    {
      const { getCssText } = createSutairu({
        theme: {
          sizes: {
            sm: 100,
            md: 200,
            lg: 500,
          },
        },
      });

      expect(getCssText()).toBe(
        '--sxs{--sxs:0 t-egkarf}@layer themed{' +
          ':root,.t-egkarf{--sizes-sm:100;--sizes-md:200;--sizes-lg:500}' +
          '}',
      );
    }

    {
      const { getCssText } = createSutairu({
        theme: {
          sizes: {
            sm: 100,
            md: 'calc($sm * 3)',
            lg: 'calc($md * 3)',
          },
        },
      });

      expect(getCssText()).toBe(
        '--sxs{--sxs:0 t-eJkcVD}@layer themed{' +
          ':root,.t-eJkcVD{' +
          '--sizes-sm:100;' +
          '--sizes-md:calc(var(--sizes-sm) * 3);' +
          '--sizes-lg:calc(var(--sizes-md) * 3)' +
          '}' +
          '}',
      );
    }
  });

  test('theme.className injects the theme', () => {
    const { getCssText, createTheme } = createSutairu();

    const theme = createTheme({
      colors: {
        blue: '#0000ff',
      },
    });

    expect(getCssText()).toBe('');

    void theme.className;

    expect(getCssText()).toBe(
      '--sxs{--sxs:0 t-gpVVQE}@layer themed{.t-gpVVQE{--colors-blue:#0000ff}}',
    );
  });
});
