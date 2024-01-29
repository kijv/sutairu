import { readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  type SutairuPluginContext,
  getHash,
  getPath,
  lazyJiti,
  notNull,
} from '@sutairu/plugin';
import { Features, transform } from 'lightningcss';
import MagicString from 'magic-string';
import type { LightningCSSOptions, Plugin, Update, ViteDevServer } from 'vite';
import type { VitePluginConfig } from '../types';

const WARN_TIMEOUT = 20000;
const WS_EVENT_PREFIX = 'sutairu:hmr';
const HASH_LENGTH = 6;

export function GlobalModeDevPlugin({
  generator,
  tokens,
  tasks,
  flushTasks,
  affectedModules,
  onInvalidate,
  extract,
  extractLoaders,
  filter,
  getConfig,
}: SutairuPluginContext): Plugin[] {
  const servers: ViteDevServer[] = [];
  const entries = new Set<string>();

  const invalidateTimer = new Map<string, NodeJS.Timeout>();
  const lastServedHash = new Map<string, string>();
  const lastServedTime = new Map<string, number>();
  const sutairuInstances = new Map<string, any>();
  // let resolved = false;
  // let resolvedWarnTimer: any;

  let lightningcssOptions: LightningCSSOptions = {
    exclude: Object.values(Features).reduce((a, b) => a + b, 0),
  };

  async function generateCSS(
    path: string,
    instance: Record<string, any> & {
      getCssText: () => string;
    },
  ) {
    await flushTasks();

    let tokensSize = tokens.size;
    do {
      await generator.generate(tokens);
      // to capture new tokens created during generation
      if (tokensSize === tokens.size) break;
      tokensSize = tokens.size;
      // biome-ignore lint/correctness/noConstantCondition: <explanation>
    } while (true);

    const css = instance.getCssText();
    const hash = getHash(css || '', HASH_LENGTH);
    lastServedTime.set(path, Date.now());
    lastServedHash.set(path, hash);

    return { hash, css };
  }

  function invalidate(timer = 10, ids: Set<string> = entries) {
    for (const server of servers) {
      for (const id of ids) {
        const mod = server.moduleGraph.getModuleById(id);
        if (!mod) continue;
        server!.moduleGraph.invalidateModule(mod);
      }
    }
    for (const id of ids) {
      clearTimeout(invalidateTimer.get(id));
      invalidateTimer.set(
        id,
        setTimeout(() => {
          lastServedHash.delete(id);
          sendUpdate(new Set([id]), lastServedTime.get(id)!);
        }, timer),
      );
    }
  }

  function sendUpdate(ids: Set<string>, lastServedTime: number) {
    for (const server of servers) {
      server.ws.send({
        type: 'update',
        updates: Array.from(ids)
          .map((id) => {
            const mod = server.moduleGraph.getModuleById(id);
            if (!mod) return null;
            return {
              acceptedPath: mod.url,
              path: mod.url,
              timestamp: lastServedTime,
              type: 'js-update',
            } as Update;
          })
          .filter(notNull),
      });
    }
  }

  onInvalidate(() => {
    invalidate(10, new Set([...entries, ...affectedModules]));
  });

  const virtualIds = new Set<{
    virtualId: string;
    id: string;
    importer: string;
  }>();

  return [
    {
      name: 'sutairu:global',
      apply: 'serve',
      enforce: 'pre',
      async config(config) {
        if (!config.css || !config.css.lightningcss) return;

        lightningcssOptions = {
          ...config.css.lightningcss,
          ...lightningcssOptions,
          exclude:
            config.css.lightningcss.exclude || lightningcssOptions.exclude,
        };
      },
      async configureServer(_server) {
        servers.push(_server);

        _server.ws.on(WS_EVENT_PREFIX, async ([id]: [string]) => {
          const preHash = lastServedHash.get(id);
          const instance = sutairuInstances.get(id);
          await generateCSS(id, instance);
          if (lastServedHash.get(id) !== preHash)
            sendUpdate(entries, lastServedTime.get(id)!);
        });
      },
      async transform(code, id) {
        if (filter(code, id)) {
          tasks.push(extract(code, id));
        }
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

        const virtualId = `\0${pathWithoutQuery}.sutairu.css`;
        virtualIds.add({
          virtualId,
          id: pathWithoutQuery,
          importer,
        });
        entries.add(virtualId);
        return virtualId;
      },
      async load(id) {
        const virtualId = Array.from(virtualIds.values()).find(
          (v) => v.virtualId === id,
        );
        if (!virtualId) return null;

        const instance = await lazyJiti(virtualId.importer)(virtualId.id);

        if (typeof instance === 'object' && 'getCssText' in instance) {
          sutairuInstances.set(virtualId.id, instance);
          const { hash, css } = await generateCSS(virtualId.id, instance);

          const { code, map } = transform({
            ...lightningcssOptions,
            filename: id,
            code: Buffer.from(css),
            sourceMap: true,
          });

          const utf8Code = Buffer.from(code).toString('utf8');
          const utf8Map = Buffer.from(map!).toString('utf8');

          const firstSxs = css.match(/--sxs{--sxs:(\d)((\s[a-zA-Z0-9-]+)*)}/);
          const firstSxsHash =
            firstSxs?.[1] && firstSxs?.[2] ? firstSxs[1] + firstSxs[2] : '';

          return {
            // add hash to the chunk of CSS that it will send back to client to check if there is new CSS generated
            code: `--sxs{--sxs:hash ${hash}}\n${
              firstSxsHash.length > 0
                ? `--sxs{--sxs:${firstSxsHash.trim()}}\n`
                : ''
            }${utf8Code}`,
            map: JSON.parse(utf8Map),
          };
        }
      },
    },
    {
      name: 'sutairu:global:post',
      apply(config, env) {
        return env.command === 'serve' && !config.build?.ssr;
      },
      enforce: 'post',
      async transform(code, id) {
        const virtualId = Array.from(virtualIds.values()).find(
          (v) => v.virtualId === id,
        );

        if (virtualId && code.includes('import.meta.hot')) {
          // inject css modules to send callback on css load
          let hmr = `
      try {
        let hash = __vite__css.match(/--sxs{--sxs:hash (\\w{${HASH_LENGTH}})}/)
        hash = hash && hash[1]
        if (!hash)
          console.warn('[sutairu-hmr]', 'failed to get sutairu hash, hmr might not work')
        else
          await import.meta.hot.send('${WS_EVENT_PREFIX}', ['${virtualId.id}']);
      } catch (e) {
        console.warn('[sutairu-hmr]', e)
      }
      if (!import.meta.url.includes('?'))
        await new Promise(resolve => setTimeout(resolve, 100))`;

          const config = (await getConfig()) as VitePluginConfig;

          if (config.hmrTopLevelAwait === false)
            hmr = `;(async function() {${hmr}\n})()`;
          hmr = `\nif (import.meta.hot) {${hmr}}`;

          const s = new MagicString(code);
          s.append(hmr);

          return {
            code: s.toString(),
            map: s.generateMap() as any,
          };
        }
      },
    },
  ];
}
