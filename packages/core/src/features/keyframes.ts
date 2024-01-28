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
import { toCssRules } from '../convert/css-rules';
import { toHash } from '../convert/hash';
import { toTailDashed } from '../convert/tail-dashed';
import { SheetGroup } from '../sheet';
import { createMemo } from '../utils/create-memo';
import { define } from '../utils/define';

const createKeyframesFunctionMap = createMemo();

/** Returns a function that applies a keyframes rule. */
export const createKeyframesFunction = (
  config: Stitches['config'],
  sheet: SheetGroup,
) =>
  createKeyframesFunctionMap(config, () => (style: Record<string, any>) => {
    /** @type {string} Keyframes Unique Identifier. @see `{CONFIG_PREFIX}-?k-{KEYFRAME_UUID}` */
    const name = `${toTailDashed(config.prefix)}k-${toHash(style)}`;

    const render = () => {
      if (!sheet.rules.global?.cache.has(name)) {
        sheet.rules.global?.cache.add(name);

        const cssRules: string[] = [];

        toCssRules(style, [], [], config, (cssText) => cssRules.push(cssText));

        const cssText = `@keyframes ${name}{${cssRules.join('')}}`;

        sheet.rules.global?.apply?.(cssText);
      }

      return name;
    };

    return define(render, {
      get name() {
        return render();
      },
      toString: render,
    });
  });
