import type Stitches from './react/types/stitches';
import { getCachedConfig } from './react/utils/cached-config';

export type {
  $$PropertyValue,
  $$ScaleValue,
  $$ThemeValue,
  CSSProperties,
  FontFace,
  CSS,
  ComponentProps,
  PropertyValue,
  ScaleValue,
  VariantProps,
} from './core';

export { createStitches } from './react/create';
export { defaultThemeMap, type DefaultThemeMap } from './core';

export const createTheme: Stitches['createTheme'] = (...args) =>
  // @ts-expect-error
  getCachedConfig().createTheme(...args);
export const globalCss: Stitches['globalCss'] = (...args) =>
  getCachedConfig().globalCss(...args);
export const keyframes: Stitches['keyframes'] = (...args) =>
  getCachedConfig().keyframes(...args);

// @ts-expect-error
export const css: Stitches['css'] = (...args) => getCachedConfig().css(...args);
export const styled: Stitches['styled'] = (...args) =>
  // @ts-expect-error
  getCachedConfig().styled(...args);
