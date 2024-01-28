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

import { version } from '../package.json';
import { resolveConfig } from './config';
import { extractorAll } from './extractor/all';
import type {
  Extractor,
  ExtractorContext,
  GenerateOptions,
  ResolvedConfig,
  UserConfig,
  UserConfigDefaults,
} from './types';
import { isString } from './utils/basic';
import { createNanoEvents } from './utils/events';

export class SutairuGenerator {
  public loaders = [] as string[];
  public extractors: Extractor[] = [extractorAll];
  public version = version;
  public config: ResolvedConfig;
  public parentOrders = new Map<string, number>();
  public events = createNanoEvents<{
    config: (config: ResolvedConfig) => void;
  }>();

  constructor(
    public userConfig: UserConfig = { content: { include: [] } },
    public defaults: UserConfigDefaults = {
      content: {
        include: [],
      },
    },
  ) {
    this.config = resolveConfig(userConfig, defaults);
    this.events.emit('config', this.config);
  }

  setConfig(userConfig?: UserConfig, defaults?: UserConfigDefaults): void {
    if (!userConfig) return;
    if (defaults) this.defaults = defaults;
    this.userConfig = userConfig;
    this.parentOrders.clear();
    this.config = resolveConfig(userConfig, this.defaults);
    this.events.emit('config', this.config);
  }

  async applyExtractors(
    code: string,
    id?: string,
    extracted: Set<string> = new Set(),
    dependencies: Set<string> = new Set(),
  ): Promise<{
    extracted: Set<string>;
    dependencies: Set<string>;
  }> {
    const context: ExtractorContext = {
      original: code,
      code,
      id,
      extracted,
      envMode: this.config.envMode,
      sutairuPath: this.config.sutairuPath,
      root: this.config.root,
      dependencies,
    };

    for (const extractor of this.extractors) {
      const result = await extractor.extract?.(context);

      if (!result) continue;

      for (const token of result.tokens) extracted.add(token);

      if (result.loaders) {
        for (const loader of result.loaders) {
          if (!this.loaders.includes(loader)) this.loaders.push(loader);
        }
      }
    }

    return { extracted, dependencies };
  }

  async updateLoaders(
    code: string,
    id?: string,
    extracted: Set<string> = new Set(),
    dependencies: Set<string> = new Set(),
  ): Promise<{
    extracted: Set<string>;
    dependencies: Set<string>;
  }> {
    const context: ExtractorContext = {
      original: code,
      code,
      id,
      extracted,
      envMode: this.config.envMode,
      sutairuPath: this.config.sutairuPath,
      root: this.config.root,
      dependencies,
    };

    for (const extractor of this.extractors) {
      const result = await extractor.extract?.(context);

      if (!result) continue;

      if (result.loaders) {
        for (const loader of result.loaders) {
          if (!this.loaders.includes(loader)) this.loaders.push(loader);
        }
      }
    }

    return { extracted, dependencies };
  }

  async generate(
    input: string | Set<string> | string[],
    options: GenerateOptions = {},
  ): Promise<{
    matched: Set<string>;
    dependencies: Set<string>;
  }> {
    const { id } = options;

    const matched = new Set<string>();
    const dependencies = new Set<string>();
    isString(input)
      ? await this.applyExtractors(input, id, matched, dependencies)
      : Array.isArray(input)
        ? new Set<string>(input)
        : input;

    return {
      matched,
      dependencies,
    };
  }
}

export function createGenerator(
  config?: UserConfig,
  defaults?: UserConfigDefaults,
) {
  return new SutairuGenerator(config, defaults);
}
