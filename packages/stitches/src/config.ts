import { type DefaultThemeMap, createStitches } from './core';
import { ConfigType } from './core/types/config';
import Stitches from './core/types/stitches';
import { INTERNAL_CONFIG } from './plugin/config/constants';
import type { UserConfig } from './plugin/config/types';
import { createStitches as react_createStitches } from './react';
import ReactStitches from './react/types/stitches';

export type * from './core';

export function defineConfig<
	Prefix extends string = '',
	Media extends {} = {},
	Theme extends {} = {},
	ThemeMap extends {} = DefaultThemeMap,
	Utils extends {} = {},
	React extends boolean = false,
>(
	config?: {
		prefix?: ConfigType.Prefix<Prefix>;
		media?: ConfigType.Media<Media>;
		theme?: ConfigType.Theme<Theme>;
		themeMap?: ConfigType.ThemeMap<ThemeMap>;
		utils?: ConfigType.Utils<Utils>;
		react?: React;
	} & UserConfig,
): React extends true
	? ReactStitches<Prefix, Media, Theme, ThemeMap, Utils>
	: Stitches<Prefix, Media, Theme, ThemeMap, Utils> {
	// @ts-expect-error Stitches doesn't have [INTERNAL_CONFIG]
	return {
		...(config?.react ?? false ? react_createStitches : createStitches)({
			...config,
			// @ts-expect-error We do this because this function is used for using the PostCSS plugin
			root: null,
		}),
		[INTERNAL_CONFIG]: config,
	};
}
