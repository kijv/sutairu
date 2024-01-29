import type { LoadConfigResult } from 'unconfig';
import type { SutairuGenerator } from './generator';
import type { BetterMap } from './utils';

export type Glob = string | string[];

export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};
export type MaybeArray<T> = T | T[];
export type RequiredKeys<
  T extends Record<string, any>,
  K extends keyof T,
> = Required<Pick<T, K>> & Omit<T, K>;
export type DeepRequired<T> = {
  [K in keyof T]-?: DeepRequired<T[K]>;
};
export type Awaitable<T> = T | Promise<T>;

export interface ExtractorContext {
  readonly original: string;
  code: string;
  id?: string;
  extracted: Set<string>;
  envMode?: ResolvedConfig['envMode'];
  sutairuPath: ResolvedConfig['sutairuPath'];
  root: ResolvedConfig['root'];
  dependencies: Set<string>;
}

export interface Extractor {
  name: string;
  order?: number;
  /**
   * Extract the code and return a list of selectors.
   *
   * Return `undefined` to skip this extractor.
   */
  extract?(
    ctx: ExtractorContext,
  ): Awaitable<
    | { tokens: string[]; loaders: string[]; dependencies: Set<string> }
    | undefined
    | void
  >;
}

export interface GenerateOptions {
  /**
   * Filepath of the file being processed.
   */
  id?: string;
}

export interface SutairuPluginContext<Config extends UserConfig = UserConfig> {
  ready: Promise<LoadConfigResult<Config>>;
  generator: SutairuGenerator;
  /** All tokens scanned */
  tokens: Set<string>;
  /** Map for all module's raw content */
  modules: BetterMap<string, string>;
  /** Module IDs that been affected by Sutairu */
  affectedModules: Set<string>;

  /** Pending promises */
  tasks: Promise<any>[];
  /**
   * Await all pending tasks
   */
  flushTasks(): Promise<any>;

  filter: (code: string, id: string) => boolean;
  extract: (code: string, id?: string) => Promise<void>;
  extractLoaders: (code: string, id?: string) => Promise<void>;

  reloadConfig: () => Promise<LoadConfigResult<Config>>;
  getConfig: () => Promise<Config>;
  onReload: (fn: () => void) => void;

  invalidate: () => void;
  onInvalidate: (fn: () => void) => void;

  root: string;
  updateRoot: (root: string) => Promise<LoadConfigResult<Config>>;
}
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

export type FilterPattern =
  | ReadonlyArray<string | RegExp>
  | string
  | RegExp
  | null;

export type ConfigBase = {
  /**
   * The root directory of your project.
   *
   * @default process.cwd()
   */
  root?: string;
  /**
   * Hook to modify the resolved config.
   *
   * First presets runs first and the user config
   */
  configResolved?: (config: ResolvedConfig) => void;
};

export interface UserOnlyOptions {
  /**
   * Environment mode
   *
   * @default 'build'
   */
  envMode?: 'dev' | 'build';
  /**
   * Where you can initialize your instance of Sutairu (createSutairu)
   *
   * @default '(cwd)/sutairu.config.{js,cjs,mjs,jsx,ts,cts,mts,tsx}'
   */
  sutairuPath?: Glob;
}

// expect include, or exclude, or both
export type ContentOptions = {
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
  include: FilterPattern;

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
};

/**
 * For other modules to aggregate the options
 */
export interface PluginOptions {
  /**
   * List of files that will also trigger config reloads
   */
  configDeps?: string[];
  /**
   * Options for sources to be extracted as utilities usages
   *
   * Supported sources:
   * - `filesystem` - extract from file system
   * - `include` - extract from build tools' transformation pipeline, such as Vite and Webpack
   * - `exclude` - extract from build tools' transformation pipeline, such as Vite and Webpack
   *
   * The usage extracted from each source will be **merged** together.
   */
  content: ContentOptions;
}

export interface UserConfig
  extends ConfigBase,
    UserOnlyOptions,
    PluginOptions {}
export interface UserConfigDefaults extends ConfigBase, UserOnlyOptions {
  /**
   * Options for sources to be extracted as utilities usages
   *
   * Supported sources:
   * - `filesystem` - extract from file system
   * - `include` - extract from build tools' transformation pipeline, such as Vite and Webpack
   * - `exclude` - extract from build tools' transformation pipeline, such as Vite and Webpack
   *
   * The usage extracted from each source will be **merged** together.
   */
  content: ContentOptions;
}

export type ResolvedConfig = Prettify<
  RequiredKeys<Omit<UserConfig, 'configResolved'>, 'sutairuPath' | 'root'>
>;
