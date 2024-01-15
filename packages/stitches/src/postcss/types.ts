import type { UserConfig } from './config/types';

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
  stitches: any;
  code: string;
  id?: string;
  extracted: Set<string>;
  envMode?: 'dev' | 'build';
  configFileList: string[];
}

export interface Extractor {
  name: string;
  order?: number;
  /**
   * Extract the code and return a list of selectors.
   *
   * Return `undefined` to skip this extractor.
   */
  extract?(ctx: ExtractorContext): Awaitable<string[] | undefined | void>;
}

export interface GenerateOptions {
  /**
   * Filepath of the file being processed.
   */
  id?: string;

  /**
   * Generate minified CSS
   * @default false
   */
  minify?: boolean;
}

export interface StitchesPostcssPluginOptions {
  content?: (
    | string
    | {
        raw: string;
        extension: string;
      }
  )[];
  directiveMap?: {
    stitches?: string;
  };
  cwd?: string;
  configOrPath?: string | UserConfig;
}
