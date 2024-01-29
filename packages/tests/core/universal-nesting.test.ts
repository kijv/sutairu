import { createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Nesting', () => {
  test('Authors can define globalCss nesting rules', () => {
    const { globalCss, getCssText } = createSutairu();

    globalCss({
      'body > a': {
        '&:not(:hover)': {
          textDecoration: 'none',
        },
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:1 hXsVBR}@layer global{body > a:not(:hover){text-decoration:none}}',
    );
  });

  test('Authors can define component nesting rules', () => {
    const { css, getCssText } = createSutairu();

    css({
      '&:not(:hover)': {
        textDecoration: 'none',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-dweUti}@layer styled{.c-dweUti:not(:hover){text-decoration:none}}',
    );
  });

  test('Authors can define recursive globalCss nesting rules', () => {
    const { globalCss, getCssText } = createSutairu();

    globalCss({
      p: {
        margin: 0,
        '& ~ &': {
          marginTop: 0,
        },
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:1 gkqgGk}@layer global{p{margin:0}p ~ p{margin-top:0}}',
    );
  });

  test('Authors can define recursive component nesting rules', () => {
    const { css, getCssText } = createSutairu();

    css({
      margin: 0,
      '& ~ &': {
        marginTop: 0,
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-fuGzNQ}@layer styled{.c-fuGzNQ{margin:0}.c-fuGzNQ ~ .c-fuGzNQ{margin-top:0}}',
    );
  });

  test('Authors can define complex recursive globalCss nesting rules', () => {
    const { globalCss, getCssText } = createSutairu();

    globalCss({
      'body > p, body > ul': {
        margin: 0,
        '& ~ &': {
          marginTop: 0,
        },
      },
    })();

    const parentCssRule = 'body > p,body > ul{margin:0}';
    const nestingCssRule =
      ':is(body > p) ~ :is(body > p),:is(body > ul) ~ :is(body > ul){margin-top:0}';

    expect(getCssText()).toBe(
      `--sxs{--sxs:1 cugdJ}@layer global{${parentCssRule + nestingCssRule}}`,
    );
  });

  test('Authors can define complex recursive component nesting rules', () => {
    const { css, getCssText } = createSutairu();

    css({
      '& > p, & > ul': {
        margin: 0,
        '& ~ &': {
          marginTop: 0,
        },
      },
    })();

    const parentCssRule = '.c-iJLHRt > p,.c-iJLHRt > ul{margin:0}';
    const nestingCssRule =
      ':is(.c-iJLHRt > p) ~ :is(.c-iJLHRt > p),:is(.c-iJLHRt > ul) ~ :is(.c-iJLHRt > ul){margin-top:0}';

    expect(getCssText()).toBe(
      `--sxs{--sxs:2 c-iJLHRt}@layer styled{${parentCssRule + nestingCssRule}}`,
    );
  });
});
