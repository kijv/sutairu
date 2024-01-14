/*
MIT License

Copyright (c) 2021-PRESENT Anthony Fu <https://github.com/antfu>

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

import fs from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { LoadConfigResult, LoadConfigSource } from 'unconfig';
import { createConfigLoader as createLoader } from 'unconfig';
import { createStitches } from '../../core';
import { createStitches as react_createStitches } from '../../react';
import { INTERNAL_CONFIG } from './constants';
import type { ResolvedConfig, UserConfig, UserConfigDefaults } from './types';

let lastSeenConfig: LoadConfigResult<UserConfig> | ResolvedConfig;

export async function loadConfig<U extends UserConfig>(
	cwd = process.cwd(),
	configOrPath: string | U = cwd,
	extraConfigSources: LoadConfigSource[] = [],
	defaults: UserConfigDefaults = {},
): Promise<LoadConfigResult<U>> {
	let inlineConfig = {} as U;
	if (typeof configOrPath !== 'string') {
		inlineConfig = configOrPath;
		if (inlineConfig.configFile === false) {
			return {
				config: inlineConfig as U,
				sources: [],
			};
		}
		configOrPath = inlineConfig.configFile || process.cwd();
	}

	const resolved = resolve(configOrPath);

	let isFile = false;
	if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
		isFile = true;
		cwd = dirname(resolved);
	}

	const loader = createLoader<U>({
		sources: isFile
			? [
					{
						files: resolved,
						extensions: [],
					},
			  ]
			: [
					{
						files: ['stitches.config'],
						extensions: ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'],
						rewrite(obj) {
							return {
								...obj,
								// @ts-expect-error Other options moved here during runtime
								...obj[INTERNAL_CONFIG],
							};
						},
					},
					...extraConfigSources,
			  ],
		cwd,
		defaults: inlineConfig,
	});

	const result = await loader.load();
	result.config = Object.assign(defaults, result.config || inlineConfig);
	if (result.config.configDeps) {
		result.sources = [
			...result.sources,
			...result.config.configDeps.map((i) => resolve(cwd, i)),
		];
	}

	lastSeenConfig = result;

	return result;
}

export function resolveConfig(
	userConfig: UserConfig = {},
	defaults: UserConfigDefaults = {},
): ResolvedConfig {
	const config = Object.assign({}, defaults, userConfig) as UserConfigDefaults;

	const sources = [config];

	const resolved: ResolvedConfig<any> = {
		...(config.react ?? false ? react_createStitches : createStitches)({
			// @ts-expect-error We do this because this function is used for using the PostCSS plugin
			root: null,
		}),
		...config,
		envMode: config.envMode || 'build',
	};

	for (const p of sources) p?.configResolved?.(resolved);

	lastSeenConfig = resolved;

	return resolved as ResolvedConfig;
}
