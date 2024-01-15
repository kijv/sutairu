import type Stitches from '../types/stitches';
import { getCachedConfig } from './utils/cached-config';

import { CreateStitches } from '../types/config';

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
} from '../../core/src/index';

export { createStitches } from './create';
export {
  defaultThemeMap,
  type DefaultThemeMap,
} from '../../core/src/default/theme-map';

export const createTheme: CreateStitches = (...args) =>
  getCachedConfig().createTheme(...args);
export const globalCss: Stitches['globalCss'] = (...args) =>
  getCachedConfig().globalCss(...args);
export const keyframes: Stitches['keyframes'] = (...args) =>
  getCachedConfig().keyframes(...args);

// @ts-expect-error Too lazy to fix this
export const css: Stitches['css'] = (...args) => getCachedConfig().css(...args);
// @ts-expect-error Too lazy to fix this
export const styled: Stitches['styled'] = (...args) =>
  getCachedConfig().styled(...args);
