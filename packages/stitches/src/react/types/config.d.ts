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

import type { DefaultThemeMap } from '../../core';
import type * as CSSUtil from '../../core/types/css-util';
import type Stitches from './stitches';

/** Configuration Interface */
declare namespace ConfigType {
  /** Prefix interface. */
  export type Prefix<T = ''> = T extends string ? T : string;

  /** Media interface. */
  export type Media<T = {}> = {
    [name in keyof T]: T[name] extends string ? T[name] : string;
  };

  /** Theme interface. */
  export type Theme<T = {}> = {
    borderStyles?: { [token in number | string]: boolean | number | string };
    borderWidths?: { [token in number | string]: boolean | number | string };
    colors?: { [token in number | string]: boolean | number | string };
    fonts?: { [token in number | string]: boolean | number | string };
    fontSizes?: { [token in number | string]: boolean | number | string };
    fontWeights?: { [token in number | string]: boolean | number | string };
    letterSpacings?: { [token in number | string]: boolean | number | string };
    lineHeights?: { [token in number | string]: boolean | number | string };
    radii?: { [token in number | string]: boolean | number | string };
    shadows?: { [token in number | string]: boolean | number | string };
    sizes?: { [token in number | string]: boolean | number | string };
    space?: { [token in number | string]: boolean | number | string };
    transitions?: { [token in number | string]: boolean | number | string };
    zIndices?: { [token in number | string]: boolean | number | string };
  } & {
    [Scale in keyof T]: {
      [Token in keyof T[Scale]]: T[Scale][Token] extends
        | boolean
        | number
        | string
        ? T[Scale][Token]
        : boolean | number | string;
    };
  };

  /** ThemeMap interface. */
  export type ThemeMap<T = {}> = {
    [Property in keyof T]: T[Property] extends string ? T[Property] : string;
  };

  /** Utility interface. */
  export type Utils<T = {}> = {
    [Property in keyof T]: T[Property] extends (value: infer V) => {}
      ?
          | T[Property]
          | ((value: V) => {
              [K in keyof CSSUtil.CSSProperties]?: CSSUtil.CSSProperties[K] | V;
            })
      : never;
  };

  export type Root<T = Document> = T extends DocumentOrShadowRoot
    ? T
    : DocumentOrShadowRoot;
}

/** Returns a function used to create a new Stitches interface. */
export type CreateStitches = {
  <
    Prefix extends string = '',
    Media extends {} = {},
    Theme extends {} = {},
    ThemeMap extends {} = DefaultThemeMap,
    Utils extends {} = {},
    Root extends DocumentOrShadowRoot = Document,
  >(config?: {
    prefix?: ConfigType.Prefix<Prefix>;
    media?: ConfigType.Media<Media>;
    theme?: ConfigType.Theme<Theme>;
    themeMap?: ConfigType.ThemeMap<ThemeMap>;
    utils?: ConfigType.Utils<Utils>;
    root?: ConfigType.Root<Root>;
  }): Stitches<Prefix, Media, Theme, ThemeMap, Utils>;
};
