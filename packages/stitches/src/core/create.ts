/*
MIT License

Copyright (c) 2022 WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { defaultThemeMap } from './default/theme-map';
import { createCssFunction } from './features/css';
import { createGlobalCssFunction } from './features/global-css';
import { createKeyframesFunction } from './features/keyframes';
import { createCreateThemeFunction } from './features/theme';
import { createSheet } from './sheet';
import { CreateStitches } from './types/config';
import type * as CSSUtil from './types/css-util';
import type Stitches from './types/stitches';
import { createMemo } from './utils/create-memo';

const createCssMap = createMemo();

/** Returns a library used to create styles. */
export const createStitches: CreateStitches = (config) => {
  let didRun = false;

  const instance = createCssMap(config || {}, (initConfig) => {
    didRun = true;

    initConfig = (typeof initConfig === 'object' && initConfig) || {};

    const prefix = 'prefix' in initConfig ? String(initConfig.prefix) : '';
    const media =
      (typeof initConfig.media === 'object' && initConfig.media) || {};
    const root =
      typeof initConfig.root === 'object'
        ? initConfig.root || null
        : globalThis.document || null;
    const theme =
      (typeof initConfig.theme === 'object' && initConfig.theme) || {};
    const themeMap = (typeof initConfig.themeMap === 'object' &&
      initConfig.themeMap) || {
      ...defaultThemeMap,
    };
    const utils =
      (typeof initConfig.utils === 'object' && initConfig.utils) || {};

    const config = {
      prefix,
      media,
      theme,
      themeMap,
      utils,
      root,
    } as Stitches['config'];

    const sheet = createSheet(root);

    const returnValue = {
      css: createCssFunction(config, sheet),
      globalCss: createGlobalCssFunction(config, sheet),
      keyframes: createKeyframesFunction(config, sheet),
      createTheme: createCreateThemeFunction(config, sheet),
      reset() {
        sheet.reset();
        returnValue.theme.toString();
      },
      theme: {},
      sheet,
      config,
      prefix,
      getCssText: sheet.toString,
      toString: sheet.toString,
    };

    // biome-ignore lint/suspicious/noAssignInExpressions: Needed to create theme
    String((returnValue.theme = returnValue.createTheme(theme)));

    return returnValue;
  });

  if (!didRun) instance.reset();

  return instance;
};
