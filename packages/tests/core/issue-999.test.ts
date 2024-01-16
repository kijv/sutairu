import { describe, expect, test } from 'vitest';
import { createStitches } from '../../stitches/src/core';

describe('Issue #519', () => {
  test('locally scoped token works 1 time', () => {
    const { css, getCssText } = createStitches({ prefix: 'fusion' });

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 fusion-c-fjkySu}' +
        '@layer styled{' +
        '.fusion-c-fjkySu{--fusion--syntax:red}' +
        '.fusion-c-fjkySu h1{color:var(--fusion--syntax)}' +
        '}',
    );
  });

  test('locally scoped prefix-free token works 1 time', () => {
    const { css, getCssText } = createStitches();

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-fjkySu}' +
        '@layer styled{' +
        '.c-fjkySu{---syntax:red}' +
        '.c-fjkySu h1{color:var(---syntax)}' +
        '}',
    );
  });

  test('locally scoped token works 2 times', () => {
    const { css, getCssText } = createStitches({ prefix: 'fusion' });

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },

      h2: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 fusion-c-lkpaIy}' +
        '@layer styled{' +
        '.fusion-c-lkpaIy{--fusion--syntax:red}' +
        '.fusion-c-lkpaIy h1{color:var(--fusion--syntax)}' +
        '.fusion-c-lkpaIy h2{color:var(--fusion--syntax)}' +
        '}',
    );
  });

  test('locally scoped prefix-free token works 2 times', () => {
    const { css, getCssText } = createStitches();

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },

      h2: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-lkpaIy}' +
        '@layer styled{' +
        '.c-lkpaIy{---syntax:red}' +
        '.c-lkpaIy h1{color:var(---syntax)}' +
        '.c-lkpaIy h2{color:var(---syntax)}' +
        '}',
    );
  });

  test('locally scoped token works 3 times', () => {
    const { css, getCssText } = createStitches({ prefix: 'fusion' });

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },

      h2: {
        color: '$$syntax',
      },

      h3: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 fusion-c-kbkiiL}' +
        '@layer styled{' +
        '.fusion-c-kbkiiL{--fusion--syntax:red}' +
        '.fusion-c-kbkiiL h1{color:var(--fusion--syntax)}' +
        '.fusion-c-kbkiiL h2{color:var(--fusion--syntax)}' +
        '.fusion-c-kbkiiL h3{color:var(--fusion--syntax)}' +
        '}',
    );
  });

  test('locally scoped prefix-free token works 3 times', () => {
    const { css, getCssText } = createStitches();

    css({
      $$syntax: 'red',

      h1: {
        color: '$$syntax',
      },

      h2: {
        color: '$$syntax',
      },

      h3: {
        color: '$$syntax',
      },
    })();

    expect(getCssText()).toBe(
      '--sxs{--sxs:2 c-kbkiiL}' +
        '@layer styled{' +
        '.c-kbkiiL{---syntax:red}' +
        '.c-kbkiiL h1{color:var(---syntax)}' +
        '.c-kbkiiL h2{color:var(---syntax)}' +
        '.c-kbkiiL h3{color:var(---syntax)}' +
        '}',
    );
  });
});
