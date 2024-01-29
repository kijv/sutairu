import { readFile, stat } from 'node:fs/promises';
import { normalize, relative } from 'node:path';
import {
  type SutairuGenerator,
  createGenerator,
  defaultFilesystemGlobs,
  lazyJiti,
  loadConfig,
  sutairuError,
} from '@sutairu/plugin';
import fg from 'fast-glob';
import { transform } from 'lightningcss';
import type { Result, Root } from 'postcss';
import postcss from 'postcss';
import type { SutairuPostcssPluginOptions } from './types';

export * from './types';

const sutairu = (
  options: SutairuPostcssPluginOptions = {
    content: { include: [] },
  },
) => {
  const { root: cwd = process.cwd() } = options;

  const directiveMap = Object.assign(
    {
      sutairu: 'sutairu',
    },
    options.directiveMap || {},
  );

  const fileMap = new Map();
  const fileClassMap = new Map();
  const fileDependencyMap = new Map<string, Set<string>>();
  const lastCssTextMap = new Map<string, string>();
  const targetCache = new Set<string>();
  const config = loadConfig(options as any);

  let generator: SutairuGenerator;
  let promises: Promise<void>[] = [];
  let lastConfigMtime = 0;
  const targetRE = new RegExp(Object.values(directiveMap).join('|'));

  const DEBUG = Boolean(process.env.SUTAIRU_DEBUG || 0);

  return {
    postcssPlugin: directiveMap.sutairu,
    plugins: [
      async (root: Root, result: Result) => {
        const from = result.opts.from?.split('?')[0];

        if (!from) return;

        let isTarget = targetCache.has(from);
        const isScanTarget = root
          .toString()
          .includes(`@${directiveMap.sutairu}`);

        if (targetRE.test(root.toString())) {
          if (!isTarget) {
            root.walkAtRules((rule) => {
              if (rule.name === directiveMap.sutairu) isTarget = true;

              if (isTarget) return false;
            });

            if (isTarget) {
              targetCache.add(from);
            }
          }
        } else if (targetCache.has(from)) {
          targetCache.delete(from);
        }

        if (!isTarget) return;

        try {
          const cfg = await config;
          if (!generator) {
            generator = createGenerator(cfg.config);
          } else if (cfg.sources.length) {
            const configMtime = (await stat(cfg.sources[0]!)).mtimeMs;
            if (configMtime > lastConfigMtime) {
              generator = createGenerator(
                (await loadConfig(options as any)).config,
              );
              lastConfigMtime = configMtime;
            }
          }
        } catch (error: any) {
          sutairuError(`config not found: ${error.message}`);
        }

        const globs =
          generator.config.content?.filesystem ?? defaultFilesystemGlobs;

        const entries = (await fg(isScanTarget ? globs : from, {
          cwd,
          absolute: true,
          ignore: ['**/node_modules/**'],
          stats: true,
        })) as unknown as { path: string; stats: { mtimeMs: number } }[];

        let cached = 0;

        const run = async (file: string, mtimeMs: number, force = false) => {
          result.messages.push({
            type: 'dependency',
            plugin: directiveMap.sutairu,
            file: normalize(file),
            parent: from,
          });

          if (fileMap.has(file) && mtimeMs <= fileMap.get(file) && !force) {
            cached += 1;
            return;
          }
          if (force) cached -= 1;
          fileMap.set(file, mtimeMs);

          const content = await readFile(file, 'utf8');
          const { matched, dependencies } = await generator.generate(content, {
            id: file,
          });

          // try to find files where this is a dependency
          const dependents = Array.from(fileDependencyMap.entries())
            .filter(([, deps]) => deps.has(file))
            .map(([file]) => file);

          for (const dep of dependents) {
            const { mtimeMs } = await stat(dep);

            // if not cached, ignore
            if (!(fileMap.has(dep) && mtimeMs <= fileMap.get(dep))) {
              continue;
            }

            await run(dep, mtimeMs, true);
            if (DEBUG) console.log(`[sutairu] extracted ${dep} (cached)`);
          }

          fileClassMap.set(file, matched);
          fileDependencyMap.set(file, dependencies);
        };
        promises.push(
          (async () => {
            // get all configs, require them, reset them
            const configs = fg
              .sync(generator.config.sutairuPath, {
                cwd,
                absolute: true,
                ignore: ['**/node_modules/**'],
              })
              .concat(
                (
                  ['@sutairu/core', '@sutairu/react']
                    .map((v) => {
                      try {
                        return require.resolve(v);
                      } catch {
                        return;
                      }
                    })
                    .filter(Boolean) as string[]
                ).flatMap((v) => [
                  v,
                  ...Object.values(require.cache[v]?.children ?? {}).map(
                    (v) => v.id,
                  ),
                ]),
              );

            for (const c of configs) {
              const mod = lazyJiti(from)(c);
              if (
                typeof mod === 'object' &&
                'sheet' in mod &&
                typeof mod?.sheet === 'object'
              ) {
                mod.sheet.cssRules = [];
                mod.sheet.rules.global.group.cssRules = [];
                mod.sheet.rules.global.cache = new Set();
              }
            }

            return;
          })(),
          ...entries.map(async ({ path: file, stats }) =>
            run(file, stats.mtimeMs),
          ),
        );

        await Promise.all(promises);
        if (DEBUG)
          console.log(
            `[sutairu] extracted ${promises.length} files (${cached} cached)`,
          );
        promises = [];

        const excludes: string[] = [];

        root.walkAtRules(directiveMap.sutairu, (rule) => {
          if (rule.params) {
            const source = rule.source;
            const configs = rule.params.split(',').map((v) => v.trim());

            let raw = '';

            for (const c of configs) {
              const mod = lazyJiti(from)(
                JSON.parse(c.replace(/(^'|'$)/g, '"')),
              );
              if (
                typeof mod === 'object' &&
                'getCssText' in mod &&
                typeof mod?.getCssText === 'function'
              ) {
                const css = mod.getCssText();
                const { code } = transform({
                  // ...lightningcssOptions,
                  filename: from,
                  code: Buffer.from(css),
                  sourceMap: false,
                });

                const utf8Code = Buffer.from(code).toString('utf8');

                const firstSxs = css.match(
                  /--sxs{--sxs:(\d)((\s[a-zA-Z0-9-]+)*)}/,
                );
                const firstSxsHash =
                  firstSxs?.[1] && firstSxs?.[2]
                    ? firstSxs[1] + firstSxs[2]
                    : '';

                raw += `${
                  firstSxsHash.length > 0
                    ? `--sxs{--sxs:${firstSxsHash.trim()}}\n`
                    : ''
                }${utf8Code}`;
                if ('reset' in mod && typeof mod === 'function') mod.reset();
              }
            }

            const css = postcss.parse(raw);
            css.walkDecls((declaration) => {
              declaration.source = source;
            });
            rule.replaceWith(css);
            excludes.push(rule.params);
          }
        });
        root.walkAtRules(directiveMap.sutairu, (rule) => {
          if (!rule.params) {
            const source = rule.source;
            const configs = fg.sync(generator.config.sutairuPath, {
              cwd,
              absolute: true,
              ignore: ['**/node_modules/**'],
            });

            let raw = '';

            for (const c of configs) {
              const mod = lazyJiti(from)(c);
              const lastCssText = lastCssTextMap.get(`${from}:${c}`);

              if (
                !(
                  typeof mod === 'object' &&
                  'getCssText' in mod &&
                  typeof mod?.getCssText === 'function'
                )
              ) {
                if (!('getCssText' in mod))
                  console.warn(
                    '[sutairu] config file missing export "getCssText", did you forget to export it?',
                  );
                else if (typeof mod?.getCssText !== 'function')
                  console.warn(
                    '[sutairu] config file exported "getCssText", but is not a function, did you export it correctly?',
                  );

                continue;
              }

              const css = mod.getCssText();
              const { code } = transform({
                // ...lightningcssOptions,
                filename: from,
                code: Buffer.from(css),
                sourceMap: false,
              });

              const utf8Code = Buffer.from(code).toString('utf8');

              const firstSxs = css.match(
                /--sxs{--sxs:(\d)((\s[a-zA-Z0-9-]+)*)}/,
              );
              const firstSxsHash =
                firstSxs?.[1] && firstSxs?.[2] ? firstSxs[1] + firstSxs[2] : '';

              raw += `${
                firstSxsHash.length > 0
                  ? `--sxs{--sxs:${firstSxsHash.trim()}}\n`
                  : ''
              }${utf8Code}`;
              if (DEBUG)
                console.log(
                  `replaced @${directiveMap.sutairu} at ${relative(cwd, from)}`,
                );

              lastCssTextMap.set(`${from}:${c}`, css);

              if (css === lastCssText)
                if (DEBUG) console.warn('[sutairu] nothing changed');
            }

            const css = postcss.parse(raw);
            css.walkDecls((declaration) => {
              declaration.source = source;
            });
            rule.replaceWith(css);
          }
        });
      },
    ],
  };
};

sutairu.postcss = true;
sutairu.default = sutairu;

export default sutairu;
