import { type CreateStitches, createStitches } from '@jujst/stitches/core';
import { describe, expect, test } from 'vitest';

describe('Configuration', () => {
  let stitches: ReturnType<CreateStitches>;

  test('createStitches()', () => {
    const { css, globalCss } = createStitches();

    expect(css).toBeInstanceOf(Function);
    expect(globalCss).toBeInstanceOf(Function);
  });

  test('createStitches({})', () => {
    const { css, globalCss } = createStitches({});

    expect(css).toBeInstanceOf(Function);
    expect(globalCss).toBeInstanceOf(Function);
  });

  test('createStitches({ prefix: "fusion-" })', () => {
    const { config } = createStitches({ prefix: 'fusion-' });

    expect(config.prefix).toBe('fusion-');
  });

  test('createStitches({ theme })', () => {
    const themeConfig = { colors: { blue: 'dodgerblue' } };

    const { config } = createStitches({ theme: themeConfig });

    expect(config.theme).toBe(themeConfig);
  });
});
