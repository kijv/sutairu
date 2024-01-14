import { createStitches } from '../../src/core';

const styleRule = '--sxs { --sxs:1 lTyTw fJmROo; }';
// @jujst/stitches uses @layer directive instead of @margin for grouping
const layerRule = '@layer { body { margin: auto; }';

const createStylesheet = (...preloadedStyles: string[]) => {
  const rules: {
    type: number;
    cssText: string;
    cssRules?: unknown[];
  }[] = [];
  const insertRule = (rule: string, index = rules.length) => {
    if (rule.startsWith('--sxs')) {
      rules.splice(index, 0, { type: 1, cssText: rule });
    }
    if (rule.startsWith('@layer')) {
      rules.splice(index, 0, { type: 4, cssText: rule, cssRules: [] });
    }
  };
  for (const style of preloadedStyles) {
    insertRule(style);
  }
  return {
    insertRule,
    cssRules: rules,
  };
};

describe('Issue #908', () => {
  test('Getting hydratable stylesheet', () => {
    const { getCssText } = createStitches({
      root: {
        // @ts-expect-error This is hidden from types
        styleSheets: [createStylesheet(styleRule, layerRule)],
      },
    });

    expect(getCssText()).toBe(layerRule);
  });
});
