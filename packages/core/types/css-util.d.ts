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

import type { DefaultThemeMap } from '../src/default/theme-map';
import type * as Native from './css';
import type * as ThemeUtil from './theme';
import type * as Util from './util';

export { Native };

/** CSS style declaration object. */
export interface CSSProperties
  extends Native.StandardLonghandProperties,
    Native.StandardShorthandProperties,
    Native.SvgProperties {}

type ValueByPropertyName<PropertyName> =
  PropertyName extends keyof CSSProperties
    ? CSSProperties[PropertyName]
    : never;

type TokenByPropertyName<PropertyName, Theme, ThemeMap> =
  PropertyName extends keyof ThemeMap
    ? TokenByScaleName<ThemeMap[PropertyName], Theme>
    : never;

type TokenByScaleName<ScaleName, Theme> = ScaleName extends keyof Theme
  ? Util.Prefixed<'$', keyof Theme[ScaleName]>
  : never;

type CSSPropertiesWithTheme<Theme, ThemeMap> = {
  [K in keyof CSSProperties]?:
    | ValueByPropertyName<K>
    | TokenByPropertyName<K, Theme, ThemeMap>
    | Native.Globals
    | ThemeUtil.ScaleValue
    | Util.NarrowIndex;
};

type CSSUtils<Theme, ThemeMap, Utils> = {
  [K in keyof Utils]?: Utils[K] extends (arg: infer P) => any
    ?
        | (P extends any[]
            ? ($$PropertyValue extends keyof P[0]
                ?
                    | ValueByPropertyName<P[0][$$PropertyValue]>
                    | TokenByPropertyName<
                        P[0][$$PropertyValue],
                        Theme,
                        ThemeMap
                      >
                    | Native.Globals
                    | ThemeUtil.ScaleValue
                    | undefined
                : $$ScaleValue extends keyof P[0]
                  ?
                      | TokenByScaleName<P[0][$$ScaleValue], Theme>
                      | { scale: P[0][$$ScaleValue] }
                      | undefined
                  : never)[]
            : $$PropertyValue extends keyof P
              ?
                  | ValueByPropertyName<P[$$PropertyValue]>
                  | TokenByPropertyName<P[$$PropertyValue], Theme, ThemeMap>
                  | Native.Globals
                  | undefined
              : $$ScaleValue extends keyof P
                ?
                    | TokenByScaleName<P[$$ScaleValue], Theme>
                    | { scale: P[$$ScaleValue] }
                    | undefined
                : never)
        | P
    : never;
};

type CSSMediaQueries<Media, Theme, ThemeMap, Utils> = {
  [K in keyof Media as `@${string & K}`]?: CSS<Media, Theme, ThemeMap, Utils>;
};

export type CSS<
  Media = {},
  Theme = {},
  ThemeMap = DefaultThemeMap,
  Utils = {},
> = CSSPropertiesWithTheme<Theme, ThemeMap> &
  CSSUtils<Theme, ThemeMap, Utils> &
  CSSMediaQueries<Media, Theme, ThemeMap, Utils> & {
    [key: string]:
      | string
      | number
      | undefined
      | CSS<Media, Theme, ThemeMap, Utils>
      | {};
  };
// export type CSS<
//   Media = {},
//   Theme = {},
//   ThemeMap = DefaultThemeMap,
//   Utils = {},
// > = {
//   // nested at-rule css styles
//   [K in Util.Prefixed<'@', keyof Media>]?: CSS<Media, Theme, ThemeMap, Utils>;
// } & {
//   // known property styles
//   [K in keyof CSSProperties as K extends keyof Utils ? never : K]?:
//     | ValueByPropertyName<K>
//     | TokenByPropertyName<K, Theme, ThemeMap>
//     | Native.Globals
//     | ThemeUtil.ScaleValue
//     | Util.NarrowIndex
//     | undefined;
// } & {
//   // known utility styles
//   [K in keyof Utils]?: Utils[K] extends (arg: infer P) => any
//     ?
//         | (P extends any[]
//             ?
//                 | ($$PropertyValue extends keyof P[0]
//                     ?
//                         | ValueByPropertyName<P[0][$$PropertyValue]>
//                         | TokenByPropertyName<
//                             P[0][$$PropertyValue],
//                             Theme,
//                             ThemeMap
//                           >
//                         | Native.Globals
//                         | ThemeUtil.ScaleValue
//                         | undefined
//                     : $$ScaleValue extends keyof P[0]
//                       ?
//                           | TokenByScaleName<P[0][$$ScaleValue], Theme>
//                           | { scale: P[0][$$ScaleValue] }
//                           | undefined
//                       : never)[]
//                 | P
//             : $$PropertyValue extends keyof P
//               ?
//                   | ValueByPropertyName<P[$$PropertyValue]>
//                   | TokenByPropertyName<P[$$PropertyValue], Theme, ThemeMap>
//                   | Native.Globals
//                   | undefined
//               : $$ScaleValue extends keyof P
//                 ?
//                     | TokenByScaleName<P[$$ScaleValue], Theme>
//                     | { scale: P[$$ScaleValue] }
//                     | undefined
//                 : never)
//         | P
//     : never;
// } & {
//   // known theme styles
//   [K in keyof ThemeMap as K extends keyof CSSProperties
//     ? never
//     : K extends keyof Utils
//       ? never
//       : K]?: Native.Globals | Util.NarrowIndex | undefined;
// } & {
//   // unknown css declaration styles
//   /** Unknown property. */
//   [K: string]:
//     | number
//     | string
//     | CSS<Media, Theme, ThemeMap, Utils>
//     | {}
//     | undefined;
// };

/** Unique symbol used to reference a property value. */
export declare const $$PropertyValue: unique symbol;

/** Unique symbol used to reference a property value. */
export type $$PropertyValue = typeof $$PropertyValue;

/** Unique symbol used to reference a token value. */
export declare const $$ScaleValue: unique symbol;

/** Unique symbol used to reference a token value. */
export type $$ScaleValue = typeof $$ScaleValue;

export declare const $$ThemeValue: unique symbol;

export type $$ThemeValue = typeof $$ThemeValue;

// https://github.com/microsoft/TypeScript/issues/37888#issuecomment-846638356
export type WithPropertyValue<T> = {
  readonly [K in $$PropertyValue]: T;
};
export type WithScaleValue<T> = {
  readonly [K in $$ScaleValue]: T;
};
