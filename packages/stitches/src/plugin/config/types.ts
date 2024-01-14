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

import type { Prettify } from '../types';

export type FilterPattern =
  | ReadonlyArray<string | RegExp>
  | string
  | RegExp
  | null;

export type ConfigBase<React extends boolean = boolean> = {
  /**
   * If you should use the react version of (@jujst/stitches/react)
   *
   * @default true
   */
  react?: React;
  /**
   * Hook to modify the resolved config.
   *
   * First presets runs first and the user config
   */
  configResolved?: (config: ResolvedConfig<React>) => void;
};

export interface UserOnlyOptions {
  /**
   * Environment mode
   *
   * @default 'build'
   */
  envMode?: 'dev' | 'build';
}

export interface ContentOptions {
  /**
   * Glob patterns to extract from the file system, in addition to other content sources.
   *
   * In dev mode, the files will be watched and trigger HMR.
   *
   * @default []
   */
  filesystem?: string[];

  /**
   * Patterns that filter the files being extracted.
   * Supports regular expressions and `picomatch` glob patterns.
   *
   * By default, `.ts` and `.js` files are NOT extracted.
   *
   * @see https://www.npmjs.com/package/picomatch
   * @default [/\.(vue|svelte|[jt]sx|mdx?|astro|elm|php|phtml|html)($|\?)/]
   */
  include?: FilterPattern;

  /**
   * Patterns that filter the files NOT being extracted.
   * Supports regular expressions and `picomatch` glob patterns.
   *
   * By default, `node_modules` and `dist` are also extracted.
   *
   * @see https://www.npmjs.com/package/picomatch
   * @default [/\.(css|postcss|sass|scss|less|stylus|styl)($|\?)/]
   */
  exclude?: FilterPattern;
}

/**
 * For other modules to aggregate the options
 */
export interface PluginOptions {
  /**
   * Load from configs files
   *
   * set `false` to disable
   */
  configFile?: string | false;
  /**
   * List of files that will also trigger config reloads
   */
  configDeps?: string[];
  /**
   * Options for sources to be extracted as utilities usages
   *
   * Supported sources:
   * - `filesystem` - extract from file system
   * - `plain` - extract from plain inline text
   * - `pipeline` - extract from build tools' transformation pipeline, such as Vite and Webpack
   *
   * The usage extracted from each source will be **merged** together.
   */
  content?: ContentOptions;
}

export interface UserConfig<React extends boolean = boolean>
  extends ConfigBase<React>,
    UserOnlyOptions,
    PluginOptions {}
export interface UserConfigDefaults<React extends boolean = boolean>
  extends ConfigBase<React>,
    UserOnlyOptions {}

export type ResolvedConfig<React extends boolean = boolean> = Prettify<
  Omit<UserConfig<React>, 'configResolved'>
>;