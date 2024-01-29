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

import path from 'node:path';
import fg from 'fast-glob';
import type { LoadConfigResult } from 'unconfig';
import type { ResolvedConfig, UserConfig, UserConfigDefaults } from '../types';

let lastSeenConfig: LoadConfigResult<UserConfig> | ResolvedConfig;

export async function loadConfig<U extends UserConfig>(
  config?: U,
): Promise<LoadConfigResult<U>> {
  let inlineConfig = {} as U;
  inlineConfig = config || ({} as U);
  return {
    config: inlineConfig as U,
    sources: [],
  };
}

export function resolveConfig(
  userConfig: UserConfig = { content: { include: [] } },
  defaults: UserConfigDefaults = {
    content: {
      include: [],
    },
  },
): ResolvedConfig {
  const config = Object.assign(
    {
      content: {
        include: [],
      },
    },
    defaults,
    userConfig,
  ) as UserConfigDefaults;

  const sources = [config];
  const root = config.root || process.cwd();
  const sutairuPath = (
    config.sutairuPath && Array.isArray(config.sutairuPath)
      ? config.sutairuPath || './sutairu.config.{js,cjs,mjs,jsx,ts,cts,mts,tsx}'
      : ['./sutairu.config.{js,cjs,mjs,jsx,ts,cts,mts,tsx}']
  ).map((i) => path.resolve(root, i));

  if (
    Array.isArray(config.sutairuPath) &&
    fg.sync(config.sutairuPath).length < 1
  ) {
    console.warn(
      '[sutairu] config file not found, sutairu might work unexpectedly.',
    );
  }

  const resolved: ResolvedConfig = {
    ...config,
    root,
    sutairuPath,
    content: {
      ...config.content,
      include: config.content.include,
    },
    envMode: config.envMode || 'build',
  };

  for (const p of sources) p?.configResolved?.(resolved);

  lastSeenConfig = resolved;

  return resolved as ResolvedConfig;
}
