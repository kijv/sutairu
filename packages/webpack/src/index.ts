import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  HASH_PLACEHOLDER_RE,
  LAYER_PLACEHOLDER_RE,
  type UserConfig,
  type UserConfigDefaults,
  createContext,
  getHash,
  getHashPlaceholder,
  getLayerPlaceholder,
  getPath,
  lazyJiti,
  setupContentExtractor,
} from '@sutairu/plugin';
import {
  type CSSModulesConfig,
  type Drafts,
  Features,
  type NonStandard,
  type PseudoClasses,
  type Targets,
  transform,
} from 'lightningcss';
import picomatch from 'picomatch';
import type { ResolvedUnpluginOptions, UnpluginOptions } from 'unplugin';
import { createUnplugin } from 'unplugin';
import type { Compilation } from 'webpack';
import WebpackSources from 'webpack-sources';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      WEBPACK_WATCH?: boolean;
    }
  }
}

/**
 * Options are spread, so you can also use options that are not typed here like
 * visitor (not exposed because it would impact too much the bundle size)
 */
type LightningCSSOptions = {
  targets?: Targets;
  include?: number;
  exclude?: number;
  drafts?: Drafts;
  nonStandard?: NonStandard;
  pseudoClasses?: PseudoClasses;
  unusedSymbols?: string[];
  cssModules?: CSSModulesConfig;
};

export interface WebpackPluginOptions extends UserConfig {
  /**
   * Manually enable watch mode
   *
   * @default false
   */
  watch?: boolean;
  lightningcss?: LightningCSSOptions;
}

const PLUGIN_NAME = 'sutairu:webpack';
const UPDATE_DEBOUNCE = 10;

export default function WebpackPlugin(
  config?: WebpackPluginOptions,
  defaults: UserConfigDefaults = {
    content: {
      include: [],
    },
  },
) {
  return createUnplugin(() => {
    const ctx = createContext<WebpackPluginOptions>(config as any, {
      envMode: process.env.NODE_ENV === 'development' ? 'dev' : 'build',
      ...defaults,
    });
    const {
      generator,
      tokens,
      filter,
      extract,
      extractLoaders,
      onInvalidate,
      tasks,
      flushTasks,
    } = ctx;

    let timer: any;
    onInvalidate(() => {
      clearTimeout(timer);
      timer = setTimeout(updateModules, UPDATE_DEBOUNCE);
    });

    tasks.push(
      setupContentExtractor(
        ctx,
        (typeof config === 'object' && config?.watch) ??
          process.env.WEBPACK_WATCH,
      ),
    );

    const virtualIds = new Map<
      string,
      {
        virtualId: string;
        importer: string;
      }
    >();
    const entries = new Set<string>();
    const hashes = new Map<string, string>();

    const lightningCSS: LightningCSSOptions = {
      ...(config?.lightningcss || {}),
      exclude: config?.lightningcss?.exclude
        ? config?.lightningcss.exclude
        : Object.values(Features).reduce((a, b) => a + b, 0),
    };

    const plugin = {
      name: 'sutairu:webpack',
      enforce: 'pre',
      transformInclude(id) {
        return filter('', id);
      },
      async transform(code, id) {
        tasks.push(extract(code, id));

        return null;
      },
      async resolveId(source, importer, _) {
        if (!importer) return null;

        const id = path.resolve(path.dirname(importer), source);
        let pathWithoutQuery = getPath(id);
        const query = id.split('?')[1];
        if (!query || query !== 'css') return null;

        if (!existsSync(pathWithoutQuery)) {
          pathWithoutQuery = lazyJiti(importer).resolve(getPath(id));
        }
        await extractLoaders(
          await readFile(pathWithoutQuery, 'utf8'),
          pathWithoutQuery,
        );

        if (
          !generator.loaders.some((l) => picomatch.isMatch(pathWithoutQuery, l))
        )
          return null;

        const config = await ctx.getConfig();
        const virtualId = `${
          config.envMode === 'build'
            ? getHash(pathWithoutQuery)
            : pathWithoutQuery
        }.sutairu.css`;
        virtualIds.set(pathWithoutQuery, {
          virtualId,
          importer,
        });
        entries.add(virtualId);
        return virtualId;
      },
      // serve the placeholders in virtual module
      async load(id) {
        const virtualId = Array.from(virtualIds.values()).find(
          (v) => v.virtualId === id,
        );

        if (!virtualId) return null;

        const hash = hashes.get(id);
        return (
          (hash ? getHashPlaceholder(hash) : '') +
          getLayerPlaceholder(virtualId.virtualId)
        );
      },
      webpack(compiler) {
        // replace the placeholders
        compiler.hooks.compilation.tap(
          PLUGIN_NAME,
          (compilation: Compilation) => {
            compilation.hooks.optimizeAssets.tapPromise(
              PLUGIN_NAME,
              async () => {
                const files = Object.keys(compilation.assets);

                await flushTasks();

                for (const file of files) {
                  // https://github.com/unocss/unocss/pull/1428
                  if (file === '*') return;

                  const virtualId = Array.from(virtualIds.entries()).find(
                    (v) => v[1].virtualId === file,
                  );
                  if (!virtualId) continue;

                  const instance = await lazyJiti(virtualId[1].importer)(
                    virtualId[0],
                  );

                  let code = compilation.assets[file]!.source().toString();
                  let replaced = false;
                  code = code.replace(HASH_PLACEHOLDER_RE, '');
                  code = code.replace(
                    LAYER_PLACEHOLDER_RE,
                    (_: string, quote: string) => {
                      replaced = true;
                      const css = instance.getCssText();
                      css;

                      if (!quote) return css;

                      // the css is in a js file, escaping
                      let escaped = JSON.stringify(css).slice(1, -1);
                      // in `eval()`, escaping twice
                      if (quote === '\\"')
                        escaped = JSON.stringify(escaped).slice(1, -1);
                      return quote + escaped;
                    },
                  );
                  if (replaced)
                    compilation.assets[file] = new WebpackSources.RawSource(
                      code,
                    ) as any;
                }
              },
            );
          },
        );
      },
    } satisfies UnpluginOptions as Required<ResolvedUnpluginOptions>;

    let lastTokenSize = tokens.size;
    async function updateModules() {
      if (!plugin.__vfsModules) return;

      await flushTasks();
      if (lastTokenSize === tokens.size) return;

      lastTokenSize = tokens.size;
      for (const id of Array.from(plugin.__vfsModules)) {
        const path = decodeURIComponent(
          id.slice(plugin.__virtualModulePrefix.length),
        );
        const virtualId = Array.from(virtualIds.entries()).find(
          (v) => v[1].virtualId === path,
        );
        if (!virtualId) return null;

        const instance = await lazyJiti(virtualId[1].importer)(virtualId[0]);

        if (typeof instance === 'object' && 'getCssText' in instance) {
          const css = instance.getCssText();

          const { code } = transform({
            ...lightningCSS,
            filename: id,
            code: Buffer.from(css),
          });

          const utf8Code = Buffer.from(code).toString('utf8');

          const firstSxs = css.match(/--sxs{--sxs:(\d)((\s[a-zA-Z0-9-]+)*)}/);
          const firstSxsHash =
            firstSxs?.[1] && firstSxs?.[2] ? firstSxs[1] + firstSxs[2] : '';

          const hash = getHash(utf8Code);
          hashes.set(path, hash);
          plugin.__vfs.writeModule(
            id,
            `--sxs{--sxs:hash ${hash}}\n${
              firstSxsHash.length > 0
                ? `--sxs{--sxs:${firstSxsHash.trim()}}\n`
                : ''
            }${utf8Code}`,
          );
        }
      }
    }

    return plugin;
  }).webpack();
}
