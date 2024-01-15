import { type DefaultThemeMap, createStitches } from './core';
import type { ConfigType } from './core/types/config';
import type Stitches from './core/types/stitches';
import { INTERNAL_CONFIG } from './postcss/config/constants';
import type { UserConfig } from './postcss/config/types';
import { createStitches as react_createStitches } from './react';
import type ReactStitches from './react/types/stitches';

export type {
  ScaleValue,
  PropertyValue,
} from './core';

export function defineConfig<
  Prefix extends string = '',
  Media extends {} = {},
  Theme extends {} = {},
  ThemeMap extends {} = DefaultThemeMap,
  Utils extends {} = {},
  Root extends DocumentOrShadowRoot = Document,
  React extends boolean = false,
>(
  config?: {
    prefix?: ConfigType.Prefix<Prefix>;
    media?: ConfigType.Media<Media>;
    theme?: ConfigType.Theme<Theme>;
    themeMap?: ConfigType.ThemeMap<ThemeMap>;
    utils?: ConfigType.Utils<Utils>;
    root?: ConfigType.Root<Root>;
    react?: React;
  } & UserConfig,
): React extends true
  ? ReactStitches<Prefix, Media, Theme, ThemeMap, Utils>
  : Stitches<Prefix, Media, Theme, ThemeMap, Utils> {
  // @ts-expect-error
  return {
    ...(config?.react ?? false ? react_createStitches : createStitches)({
      ...config,
      // @ts-expect-error
      root: null,
    }),
    [INTERNAL_CONFIG]: config,
  };
}
