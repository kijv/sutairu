import { readFile } from 'node:fs/promises';
import path, { isAbsolute, resolve } from 'node:path';
import {
  LAYER_PLACEHOLDER_RE,
  RESOLVED_ID_RE,
  type SutairuPluginContext,
  getHash,
  getLayerPlaceholder,
  getPath,
  lazyJiti,
  replaceAsync,
  setupContentExtractor,
} from '@sutairu/plugin';
import { Features, transform } from 'lightningcss';
import type { NormalizedOutputOptions, RenderedChunk } from 'rollup';
import type { LightningCSSOptions, Plugin, ResolvedConfig } from 'vite';
import type { VitePluginConfig } from '../types';

// https://github.com/vitejs/vite/blob/main/packages/plugin-legacy/src/index.ts#L742-L744
function isLegacyChunk(chunk: RenderedChunk, options: NormalizedOutputOptions) {
  return options.format === 'system' && chunk.fileName.includes('-legacy');
}

export function GlobalModeBuildPlugin(
  ctx: SutairuPluginContext<VitePluginConfig>,
): Plugin[] {
  const {
    generator,
    ready,
    extract,
    tokens,
    filter,
    getConfig,
    tasks,
    flushTasks,
    extractLoaders,
  } = ctx;
  const virtualIds = new Map<
    string,
    {
      virtualId: string;
      importer: string;
    }
  >();
  const layerImporterMap = new Map<string, string>();
  let viteConfig: ResolvedConfig;

  // use maps to differentiate multiple build. using outDir as key
  const cssPostPlugins = new Map<string | undefined, Plugin | undefined>();
  const cssPlugins = new Map<string | undefined, Plugin | undefined>();

  let lastTokenSize = 0;
  let lastResult: { matched: Set<string> } | undefined;
  async function generateAll() {
    await flushTasks();
    if (lastResult && lastTokenSize === tokens.size) return lastResult;
    lastResult = await generator.generate(tokens);
    lastTokenSize = tokens.size;
    return lastResult;
  }

  let lightningcssOptions: LightningCSSOptions = {
    exclude: Object.values(Features).reduce((a, b) => a + b, 0),
  };

  let replaced = false;

  return [
    {
      name: 'sutairu:global:build:scan',
      apply: 'build',
      enforce: 'pre',
      async buildStart() {
        virtualIds.clear();
        tasks.length = 0;
        lastTokenSize = 0;
        lastResult = undefined;
      },
      transform(code, id) {
        if (filter(code, id)) tasks.push(extract(code, id));
        return null;
      },
      async resolveId(source, importer) {
        if (!importer) return null;

        const id = path.resolve(path.dirname(importer), source);
        const pathWithoutQuery = getPath(id);
        const query = id.split('?')[1];
        if (!query || query !== 'css') return null;

        await extractLoaders(
          await readFile(pathWithoutQuery, 'utf8'),
          pathWithoutQuery,
        );

        if (!generator.loaders.includes(pathWithoutQuery)) return null;

        const virtualId = `/${getHash(pathWithoutQuery)}.sutairu.css`;
        virtualIds.set(pathWithoutQuery, {
          virtualId,
          importer,
        });
        return virtualId;
      },
      load(id) {
        // const layer = resolveLayer(getPath(id));
        const virtualId = Array.from(virtualIds).find(
          ([_, { virtualId }]) => virtualId === id,
        )?.[1];
        if (virtualId) {
          //   vfsLayers.add(layer);
          return getLayerPlaceholder(virtualId.virtualId);
        }
      },
      moduleParsed({ id, importedIds }) {
        if (!layerImporterMap.has(id)) return;

        const layerKey = layerImporterMap.get(id)!;
        if (!importedIds.includes(layerKey)) {
          layerImporterMap.delete(id);
          virtualIds.delete(getPath(id));
        }
      },
      async configResolved(config) {
        const distDirs = [resolve(config.root, config.build.outDir)];

        // for Vite lib more with rollupOptions.output, #2231
        if (config.build.rollupOptions.output) {
          const outputOptions = config.build.rollupOptions.output;
          const outputDirs = Array.isArray(outputOptions)
            ? (outputOptions
                .map((option) => option.dir)
                .filter(Boolean) as string[])
            : outputOptions.dir
              ? [outputOptions.dir]
              : [];

          for (const dir of outputDirs) {
            distDirs.push(dir);

            if (!isAbsolute(dir)) distDirs.push(resolve(config.root, dir));
          }
        }

        const cssPostPlugin = config.plugins.find(
          (i) => i.name === 'vite:css-post',
        );
        const cssPlugin = config.plugins.find((i) => i.name === 'vite:css');

        if (cssPostPlugin)
          for (const dir of distDirs) {
            cssPostPlugins.set(dir, cssPostPlugin);
          }

        if (cssPlugin)
          for (const dir of distDirs) {
            cssPlugins.set(dir, cssPlugin);
          }

        await ready;
      },
      // we inject a hash to chunk before the dist hash calculation to make sure
      // the hash is different when sutairu changes
      async renderChunk(_, chunk, options) {
        if (isLegacyChunk(chunk, options)) return null;

        // skip hash generation on non-entry chunk
        if (!Object.keys(chunk.modules).some((i) => RESOLVED_ID_RE.test(i)))
          return null;

        const cssPost = cssPostPlugins.get(options.dir);
        if (!cssPost) {
          this.warn(
            '[sutairu] failed to find vite:css-post plugin. It might be an internal bug of Sutairu',
          );
          return null;
        }

        // let { css } = await generateAll();
        const fakeCssId = `${viteConfig.root}/${chunk.fileName}-sutairu-hash.css`;

        // fool the css plugin to generate the css in corresponding chunk
        chunk.modules[fakeCssId] = {
          code: null,
          originalLength: 0,
          removedExports: [],
          renderedExports: [],
          renderedLength: 0,
        };

        return null;
      },
    },
    {
      name: 'sutairu:global:content',
      enforce: 'pre',
      configResolved(config) {
        viteConfig = config;
      },
      buildStart() {
        tasks.push(setupContentExtractor(ctx, viteConfig.command === 'serve'));
      },
    },
    {
      name: 'sutairu:global:build:generate',
      apply: 'build',
      async renderChunk(code, chunk, options) {
        if (isLegacyChunk(chunk, options)) return null;

        // if (!Object.keys(chunk.modules).some((i) => RESOLVED_ID_RE.test(i)))
        //   return null;

        // const cssPost = cssPostPlugins.get(options.dir);
        // if (!cssPost) {
        //   this.warn(
        //     '[sutairu] failed to find vite:css-post plugin. It might be an internal bug of Sutairu',
        //   );
        //   return null;
        // }
        // const result = await generateAll();
        // const mappedVfsLayer = Array.from(vfsLayers).map((layer) =>
        //   layer === LAYER_MARK_ALL ? layer : layer.replace(/^_/, ''),
        // );
        // const cssWithLayers = Array.from(vfsLayers)
        //   .map(
        //     (layer) =>
        //       `#--sutairu-layer-start--${layer}--{start:${layer}} ${
        //         layer === LAYER_MARK_ALL
        //           ? result.getLayers(undefined, mappedVfsLayer)
        //           : result.getLayer(layer.replace(/^_/, '')) || ''
        //       } #--sutairu-layer-end--${layer}--{end:${layer}}`,
        //   )
        //   .join('');

        // const fakeCssId = `${viteConfig.root}/${chunk.fileName}-sutairu-hash.css`;
        // const css = await applyCssTransform(
        //   cssWithLayers,
        //   fakeCssId,
        //   options.dir,
        //   this,
        // );
        // const transformHandler =
        //   'handler' in cssPost.transform!
        //     ? cssPost.transform.handler
        //     : cssPost.transform!;
        // await transformHandler.call({} as unknown as any, css, fakeCssId);
      },
    },
    {
      name: 'sutairu:global:build:bundle',
      apply: 'build',
      enforce: 'post',
      async config(config) {
        if (!config.css || !config.css.lightningcss) return;

        lightningcssOptions = {
          ...config.css.lightningcss,
          ...lightningcssOptions,
          exclude:
            config.css.lightningcss.exclude || lightningcssOptions.exclude,
        };
      },
      // rewrite the css placeholders
      async generateBundle(options, bundle) {
        const checkJs = ['umd', 'amd', 'iife'].includes(options.format);
        const files = Object.keys(bundle).filter(
          (i) => i.endsWith('.css') || (checkJs && i.endsWith('.js')),
        );

        if (!files.length) return;

        if (!virtualIds.size) {
          // If `vfsLayers` is empty and `replaced` is true, that means
          // `generateBundle` hook is called on previous build pipeline. e.g. ssr
          // Since we already replaced the layers and don't have any more layers
          // to replace on current build pipeline, we can skip the warning.
          if (replaced) return;
          const msg =
            "[sutairu] entry module not found, have you add `import 'config.ts?css'` in your main entry?";
          this.warn(msg);
          return;
        }

        const getLayer = (layer: string, input: string, replace = false) => {
          const re = new RegExp(
            `#--sutairu-layer-start--${layer}--\\{start:${layer}\\}([\\s\\S]*?)#--sutairu-layer-end--${layer}--\\{end:${layer}\\}`,
            'g',
          );
          if (replace) return input.replace(re, '');

          const match = re.exec(input);
          if (match) return match[1];
          return '';
        };

        for (const file of files) {
          const chunk = bundle[file];
          if (!chunk) continue;
          if (chunk.type === 'asset' && typeof chunk.source === 'string') {
            chunk.source = await replaceAsync(
              chunk.source,
              LAYER_PLACEHOLDER_RE,
              async () => {
                replaced = true;
                return '';
              },
            );
            for (const layer of Array.from(virtualIds)) {
              const sutairuInstance = await lazyJiti(layer[1].importer)(
                layer[0],
              );
              if (
                typeof sutairuInstance !== 'object' ||
                !('getCssText' in sutairuInstance) ||
                typeof sutairuInstance.getCssText !== 'function'
              )
                continue;

              const initialCss = await sutairuInstance.getCssText();
              const { code } = transform({
                ...lightningcssOptions,
                code: Buffer.from(initialCss),
                filename: layer[0],
                minify: true,
              });

              const firstSxs = initialCss.match(
                /--sxs{--sxs:(\d)((\s[a-zA-Z0-9-]+)*)}/,
              );
              const firstSxsHash = firstSxs?.[1] + firstSxs?.[2];

              chunk.source = `${
                firstSxsHash ? `--sxs{--sxs:${firstSxsHash.trim()}}` : ''
              }${Buffer.from(code).toString('utf8')}`;
            }
          } else if (chunk.type === 'chunk' && typeof chunk.code === 'string') {
            // const js = chunk.code.replace(HASH_PLACEHOLDER_RE, '');
            // chunk.code = await replaceAsync(
            //   js,
            //   LAYER_PLACEHOLDER_RE,
            //   async (_, __, layer) => {
            //     replaced = true;
            //     const css = getLayer(layer, js);
            //     return css.replace(/\n/g, '').replace(/(?<!\\)(['"])/g, '\\$1');
            //   },
            // );
            // Array.from(vfsLayers).forEach((layer) => {
            //   chunk.code = getLayer(layer, chunk.code, true);
            // });
          }
        }

        if (!replaced) {
          let msg =
            '[sutairu] does not find CSS placeholder in the generated chunks';
          if (viteConfig.build.lib && checkJs)
            msg +=
              "\nIt seems you are building in library mode, it's recommended to set `build.cssCodeSplit` to true.\nSee https://github.com/vitejs/vite/issues/1579";
          else msg += '\nThis is likely an internal bug of sutairu vite plugin';
          this.error(msg);
        }
      },
    },
  ];
}
