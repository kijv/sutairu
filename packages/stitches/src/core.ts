import type Stitches from './core/types/stitches';
import { getCachedConfig } from './core/utils/cached-config';

import type * as Config from './core/types/config';
import type * as CSSUtil from './core/types/css-util';
import type * as StyledComponent from './core/types/styled-component';

export type {
  $$PropertyValue,
  $$ScaleValue,
  $$ThemeValue,
} from './core/types/css-util';
export type CreateStitches = Config.CreateStitches;
export type CSSProperties = CSSUtil.CSSProperties;
export type FontFace = CSSUtil.Native.AtRule.FontFace;

/** Returns a Style interface from a configuration, leveraging the given media and style map. */
export type CSS<
  Config extends {
    media?: {};
    theme?: {};
    themeMap?: {};
    utils?: {};
  } = {
    media: {};
    theme: {};
    themeMap: {};
    utils: {};
  },
> = CSSUtil.CSS<
  Config['media'],
  Config['theme'],
  Config['themeMap'],
  Config['utils']
>;

/** Returns the properties, attributes, and children expected by a component. */
export type ComponentProps<Component> = Component extends (
  ...args: any[]
) => any
  ? Parameters<Component>[0]
  : never;

/** Returns a type that expects a value to be a kind of CSS property value. */
export type PropertyValue<
  Property extends keyof CSSUtil.CSSProperties,
  Config = null,
> = Config extends null
  ? CSSUtil.WithPropertyValue<Property>
  : Config extends { [K: string]: any }
    ? CSSUtil.CSS<
        Config['media'],
        Config['theme'],
        Config['themeMap'],
        Config['utils']
      >[Property]
    : never;

/** Returns a type that expects a value to be a kind of theme scale value. */
export type ScaleValue<Scale, Config = null> = Config extends null
  ? CSSUtil.WithScaleValue<Scale>
  : Config extends { [K: string]: any }
    ? Scale extends keyof Config['theme']
      ? `$${string & keyof Config['theme'][Scale]}`
      : never
    : never;

/** Returns a type that suggests variants from a component as possible prop values. */
export type VariantProps<Component extends { [key: symbol | string]: any }> =
  StyledComponent.TransformProps<
    Component[StyledComponent.$$StyledComponentProps],
    Component[StyledComponent.$$StyledComponentMedia]
  >;

export { createStitches } from './core/create';
export {
  defaultThemeMap,
  type DefaultThemeMap,
} from './core/default/theme-map';

export const createTheme: Stitches['createTheme'] = (...args) =>
  getCachedConfig().createTheme(...args);
export const globalCss: Stitches['globalCss'] = (...args) =>
  getCachedConfig().globalCss(...args);
export const keyframes: Stitches['keyframes'] = (...args) =>
  getCachedConfig().keyframes(...args);
// @ts-expect-error
export const css: Stitches['css'] = (...args) => getCachedConfig().css(...args);
