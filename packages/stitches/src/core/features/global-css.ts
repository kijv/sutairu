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

import { toCssRules } from '../convert/css-rules';
import { toHash } from '../convert/hash';
import { SheetGroup } from '../sheet';
import Stitches from '../types/stitches';
import { createMemo } from '../utils/create-memo';
import { define } from '../utils/define';

const createGlobalCssFunctionMap = createMemo();

/** Returns a function that applies global styles. */
export const createGlobalCssFunction = (
  config: Stitches['config'],
  sheet: SheetGroup,
) =>
  createGlobalCssFunctionMap(config, () => (...styles: object[]) => {
      const render = () => {
        for (const _style of styles) {
          const style: Record<string, any> =
            (typeof _style === 'object' && _style) || {};

          const uuid = toHash(style);

          if (!sheet.rules.global?.cache.has(uuid)) {
            sheet.rules.global?.cache.add(uuid);

            // support @import rules
            if ('@import' in style) {
              let importIndex =
                ([] as typeof sheet.sheet.cssRules).indexOf.call(
                  sheet.sheet.cssRules,
                  sheet.rules.themed?.group!,
                ) - 1;

              // wrap import in quotes as a convenience
              for (let importValue of [].concat(style['@import']) as string[]) {
                importValue =
                  importValue.includes('"') || importValue.includes("'")
                    ? importValue
                    : `"${importValue}"`;

                sheet.sheet.insertRule(
                  `@import ${importValue};`,
                  importIndex++,
                );
              }

              // biome-ignore lint/performance/noDelete: This messes up the object if we don't do it like this
              delete style['@import'];
            }

            toCssRules(style, [], [], config, (cssText) => {
              sheet.rules.global?.apply?.(cssText);
            });
          }
        }

        return '';
      };

      return define(render, {
        toString: render,
      });
    });
