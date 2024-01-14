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

import type * as CSSUtil from '../../core/types/css-util';
import type * as ThemeUtil from '../../core/types/theme';
import type * as Util from '../../core/types/util';
import type * as StyledComponent from './styled-component';

/** Remove an index signature from a type */
export type RemoveIndex<T> = {
  [k in keyof T as string extends k
    ? never
    : number extends k
      ? never
      : k]: T[k];
};

export interface CssFunctionType<
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = {},
  Utils extends {} = {},
> {
  <
    Composers extends (
      | string
      | Util.NarrowFunction
      | {
          [name: string]: unknown;
        }
    )[],
    css = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
  >(
    ...composers: {
      [K in keyof Composers]: // Strings and Functions can be skipped over
      string extends Composers[K]
        ? Composers[K]
        : Composers[K] extends string | Util.NarrowFunction
          ? Composers[K]
          : RemoveIndex<css> & {
              /** The **variants** property lets you set a subclass of styles based on a key-value pair.
               *
               * [Read Documentation](https://stitches.dev/docs/variants)
               */
              variants?: {
                [Name in string]: {
                  [Pair in number | string]: css;
                };
              };
              /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
               */
              compoundVariants?: (('variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.NarrowString;
                  }
                : Util.WideObject) & {
                css: css;
              })[];
              /** The **defaultVariants** property allows you to predefine the active key-value pairs of variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#default-variants)
               */
              defaultVariants?: 'variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.NarrowString;
                  }
                : Util.WideObject;
            } & css & {
                [K2 in keyof Composers[K]]: K2 extends
                  | 'compoundVariants'
                  | 'defaultVariants'
                  | 'variants'
                  ? unknown
                  : K2 extends keyof css
                    ? css[K2]
                    : unknown;
              };
    }
  ): StyledComponent.CssComponent<
    StyledComponent.StyledComponentType<Composers>,
    StyledComponent.StyledComponentProps<Composers>,
    Media,
    css
  >;
}

export interface StyledFunctionType<
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = {},
  Utils extends {} = {},
> {
  <
    Type extends
      | keyof JSX.IntrinsicElements
      | React.ComponentType<any>
      | Util.NarrowFunction = 'span',
    Composers extends (
      | string
      | React.ComponentType<any>
      | Util.NarrowFunction
      | {
          [name: string]: unknown;
        }
    )[] = [],
    css = CSSUtil.CSS<Media, Theme, ThemeMap, Utils>,
  >(
    type?: Type,
    ...composers: {
      [K in keyof Composers]: // Strings, React Components, and Functions can be skipped over
      string extends Composers[K]
        ? Composers[K]
        : Composers[K] extends
              | string
              | React.ComponentType<any>
              | Util.NarrowFunction
          ? Composers[K]
          : RemoveIndex<css> & {
              /** The **variants** property lets you set a subclass of styles based on a key-value pair.
               *
               * [Read Documentation](https://stitches.dev/docs/variants)
               */
              variants?: {
                [Name in string]: {
                  [Pair in number | string]: css;
                };
              };
              /** The **compoundVariants** property lets you to set a subclass of styles based on a combination of active variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#compound-variants)
               */
              compoundVariants?: (('variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.NarrowString;
                  }
                : Util.WideObject) & {
                css: css;
              })[];
              /** The **defaultVariants** property allows you to predefine the active key-value pairs of variants.
               *
               * [Read Documentation](https://stitches.dev/docs/variants#default-variants)
               */
              defaultVariants?: 'variants' extends keyof Composers[K]
                ? {
                    [Name in keyof Composers[K]['variants']]?:
                      | Util.Widen<keyof Composers[K]['variants'][Name]>
                      | Util.NarrowString;
                  }
                : Util.WideObject;
            } & css & {
                [K2 in keyof Composers[K]]: K2 extends
                  | 'compoundVariants'
                  | 'defaultVariants'
                  | 'variants'
                  ? unknown
                  : K2 extends keyof css
                    ? css[K2]
                    : unknown;
              };
    }
  ): StyledComponent.StyledComponent<
    Type,
    StyledComponent.StyledComponentProps<Composers>,
    Media,
    CSSUtil.CSS<Media, Theme, ThemeMap, Utils>
  >;
}

/** Stitches interface. */
export default interface Stitches<
  Prefix extends string = '',
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = {},
  Utils extends {} = {},
  Root extends DocumentOrShadowRoot = Document,
> {
  config: {
    prefix: Prefix;
    media: Media;
    theme: Theme;
    themeMap: ThemeMap;
    utils: Utils;
    root: Root;
  };
  prefix: Prefix;
  globalCss: {
    <Styles extends { [K: string]: any }>(
      ...styles: ({
        /** The **@import** CSS at-rule imports style rules from other style sheets. */
        '@import'?: unknown;

        /** The **@font-face** CSS at-rule specifies a custom font with which to display text. */
        '@font-face'?: unknown;
      } & {
        [K in keyof Styles]: K extends '@import'
          ? string | string[]
          : K extends '@font-face'
            ?
                | CSSUtil.Native.AtRule.FontFace
                | Array<CSSUtil.Native.AtRule.FontFace>
            : K extends `@keyframes ${string}`
              ? {
                  [KeyFrame in string]: CSSUtil.CSS<
                    Media,
                    Theme,
                    ThemeMap,
                    Utils
                  >;
                }
              : K extends `@property ${string}`
                ? CSSUtil.Native.AtRule.Property
                : CSSUtil.CSS<Media, Theme, ThemeMap, Utils>;
      })[]
    ): {
      (): string;
    };
  };
  keyframes: {
    (style: {
      [offset: string]: CSSUtil.CSS<Media, Theme, ThemeMap, Utils>;
    }): {
      (): string;
      name: string;
    };
  };
  createTheme: {
    <
      Argument0 extends
        | string
        | ({
            [Scale in keyof Theme]?: {
              [Token in keyof Theme[Scale]]?: boolean | number | string;
            };
          } & {
            [scale in string]: {
              [token in number | string]: boolean | number | string;
            };
          }),
      Argument1 extends
        | string
        | ({
            [Scale in keyof Theme]?: {
              [Token in keyof Theme[Scale]]?: boolean | number | string;
            };
          } & {
            [scale in string]: {
              [token in number | string]: boolean | number | string;
            };
          }),
    >(
      nameOrScalesArg0: Argument0,
      nameOrScalesArg1?: Argument1,
    ): string & {
      className: string;
      selector: string;
    } & (Argument0 extends string
        ? ThemeTokens<Argument1, Prefix>
        : ThemeTokens<Argument0, Prefix>);
  };
  theme: string & {
    className: string;
    selector: string;
  } & {
    [Scale in keyof Theme]: {
      [token in keyof Theme[Scale]]: ThemeUtil.Token<
        Extract<token, string | number>,
        string,
        Extract<Scale, string | void>,
        Extract<Prefix, string | void>
      >;
    };
  };
  reset: {
    (): void;
  };
  getCssText: {
    (): string;
  };
  css: {
    withConfig: (config: {
      componentId?: string;
      displayName?: string;
      shouldForwardStitchesProp?: (
        prop: 'css' | (string & {}),
      ) => boolean | void;
    }) => CssFunctionType<Media, Theme, ThemeMap, Utils>;
  } & CssFunctionType<Media, Theme, ThemeMap, Utils>;
  styled: {
    withConfig: (config?: {
      componentId?: string;
      displayName?: string;
      shouldForwardStitchesProp?: (
        prop: 'css' | (string & {}),
      ) => boolean | void;
    }) => StyledFunctionType<Media, Theme, ThemeMap, Utils>;
  } & StyledFunctionType<Media, Theme, ThemeMap, Utils>;
}

export type ThemeTokens<Values, Prefix> = {
  [Scale in keyof Values]: {
    [token in keyof Values[Scale]]: ThemeUtil.Token<
      Extract<token, number | string>,
      Values[Scale][token] & (string | number),
      Extract<Scale, string | void>,
      Extract<Prefix, string | void>
    >;
  };
};
