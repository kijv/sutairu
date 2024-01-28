import { type CreateSutairu, createSutairu } from '@sutairu/core';
import { describe, expect, test } from 'vitest';

describe('Configuration', () => {
  let stitches: ReturnType<CreateSutairu>;

  test('createSutairu()', () => {
    const { css, globalCss } = createSutairu();

    expect(css).toBeInstanceOf(Function);
    expect(globalCss).toBeInstanceOf(Function);
  });

  test('createSutairu({})', () => {
    const { css, globalCss } = createSutairu({});

    expect(css).toBeInstanceOf(Function);
    expect(globalCss).toBeInstanceOf(Function);
  });

  test('createSutairu({ prefix: "fusion-" })', () => {
    const { config } = createSutairu({ prefix: 'fusion-' });

    expect(config.prefix).toBe('fusion-');
  });

  test('createSutairu({ theme })', () => {
    const themeConfig = { colors: { blue: 'dodgerblue' } };

    const { config } = createSutairu({ theme: themeConfig });

    expect(config.theme).toBe(themeConfig);
  });
});
