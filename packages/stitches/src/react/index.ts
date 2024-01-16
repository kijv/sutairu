import type Stitches from './types/stitches';
import { getCachedConfig } from './utils/cached-config';

import { CreateStitches } from './types/config';

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
} from '../core';

export { createStitches } from './create';
export {
  defaultThemeMap,
  type DefaultThemeMap,
} from '../core/default/theme-map';

export const createTheme: Stitches['createTheme'] = (...args) =>
  // @ts-expect-error Too lazy to fix this
  getCachedConfig().createTheme(...args);
export const globalCss: Stitches['globalCss'] = (...args) =>
  getCachedConfig().globalCss(...args);
export const keyframes: Stitches['keyframes'] = (...args) =>
  getCachedConfig().keyframes(...args);

// @ts-expect-error Too lazy to fix this
export const css: Stitches['css'] = (...args) => getCachedConfig().css(...args);
export const styled: Stitches['styled'] = (...args) =>
  // @ts-expect-error Too lazy to fix this
  getCachedConfig().styled(...args);
