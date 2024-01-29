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

import Stitches from '../../types/stitches';
import { toHash } from '../convert/hash';
import { toTailDashed } from '../convert/tail-dashed';
import { toTokenizedValue } from '../convert/tokenized-value';
import { SheetGroup } from '../sheet';
import { ThemeToken } from '../theme-token';
import { createMemo } from '../utils/create-memo';

const createCreateThemeFunctionMap = createMemo();

/** Returns a function that applies a theme and returns tokens of that theme. */
export const createCreateThemeFunction = (
  config: Stitches['config'],
  sheet: SheetGroup,
) =>
  createCreateThemeFunctionMap(
    config,
    () => (_className: string | object, _style?: object) => {
      // theme is the first argument if it is an object, otherwise the second argument as an object
      const style =
        (typeof _className === 'object' && _className) || Object(_style);

      // class name is the first argument if it is a string, otherwise an empty string
      let className = typeof _className === 'string' ? _className : '';

      /** @type {string} Theme name. @see `{CONFIG_PREFIX}t-{THEME_UUID}` */
      className =
        className || `${toTailDashed(config.prefix)}t-${toHash(style)}`;

      const selector = `.${className}`;

      const themeObject: Record<string, any> = {};
      const cssProps: string[] = [];

      for (const scale in style) {
        themeObject[scale] = {};

        for (const token in style[scale]) {
          const propertyName = `--${toTailDashed(
            config.prefix,
          )}${scale}-${token}`;
          const propertyValue = toTokenizedValue(
            String(style[scale][token]),
            config.prefix,
            scale,
          );

          themeObject[scale][token] = new ThemeToken(
            token,
            propertyValue,
            scale,
            config.prefix,
          );

          cssProps.push(`${propertyName}:${propertyValue}`);
        }
      }

      const render = () => {
        if (cssProps.length && !sheet.rules.themed?.cache.has(className)) {
          sheet.rules.themed?.cache.add(className);

          const rootPrelude = style === config.theme ? ':root,' : '';
          const cssText = `${rootPrelude}.${className}{${cssProps.join(';')}}`;

          sheet.rules.themed?.apply?.(cssText);
        }

        return className;
      };

      return {
        ...themeObject,
        get className() {
          return render();
        },
        selector,
        toString: render,
      };
    },
  );
