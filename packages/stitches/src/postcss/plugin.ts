import { readFile, stat } from 'node:fs/promises';
import { normalize } from 'node:path';
import fg from 'fast-glob';
import postcss, { type Result, type Root } from 'postcss';
import { loadConfig } from './config';
import { defaultFilesystemGlobs } from './defaults';
import { type StitchesGenerator, createGenerator } from './generator';
import { stitchesError } from './stitches-error';
import type { StitchesPostcssPluginOptions } from './types';

export * from './types';

function stitches(options: StitchesPostcssPluginOptions = {}) {
  const { cwd = process.cwd(), configOrPath } = options;

  const directiveMap = Object.assign(
    {
      stitches: 'stitches',
    },
    options.directiveMap || {},
  );

  const fileMap = new Map();
  const fileClassMap = new Map();
  const classes = new Set<string>();
  const targetCache = new Set<string>();
  const config = loadConfig(cwd, configOrPath);

  let stitches: StitchesGenerator;
  let promises: Promise<void>[] = [];
  let last_config_mtime = 0;
  const targetRE = new RegExp(Object.values(directiveMap).join('|'));

  return {
    postcssPlugin: `jujst-${directiveMap.stitches}`,
    plugins: [
      async (root: Root, result: Result) => {
        const from = result.opts.from?.split('?')[0];

        if (!from) return;

        let isTarget = targetCache.has(from);
        const isScanTarget = root
          .toString()
          .includes(`@${directiveMap.stitches}`);

        if (targetRE.test(root.toString())) {
          if (!isTarget) {
            root.walkAtRules((rule) => {
              if (rule.name === directiveMap.stitches) isTarget = true;

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
          if (!stitches) {
            stitches = createGenerator(cfg.sources, cfg.config);
          } else if (cfg.sources.length) {
            // force string assignment because we are fine if it fails
            const config_mtime = (await stat(cfg.sources[0] as string)).mtimeMs;
            if (config_mtime > last_config_mtime) {
              stitches = createGenerator(
                cfg.sources,
                (await loadConfig(cwd, configOrPath)).config,
              );
              last_config_mtime = config_mtime;
            }
          }
        } catch (error: any) {
          stitchesError(`Config not found: ${error.message}`);
        }

        const globs =
          stitches.config.content?.filesystem ?? defaultFilesystemGlobs;

        const entries = (await fg(isScanTarget ? globs : from, {
          cwd,
          absolute: true,
          ignore: ['**/node_modules/**'],
          stats: true,
        })) as unknown as { path: string; mtimeMs: number }[];

        promises.push(
          (async () => {
            // every time the code changes, we need to empty the sheet
            stitches.core.reset();
          })() as Promise<void>,
          ...entries.map(async ({ path: file, mtimeMs }) => {
            result.messages.push({
              type: 'dependency',
              plugin: directiveMap.stitches,
              file: normalize(file),
              parent: from,
            });

            if (fileMap.has(file) && mtimeMs <= fileMap.get(file)) return;

            fileMap.set(file, mtimeMs);

            const content = await readFile(file, 'utf8');
            const { matched } = await stitches.generate(content, {
              id: file,
              minify: process.env.NODE_ENV === 'production',
            });

            fileClassMap.set(file, matched);
          }),
        );

        await Promise.all(promises);
        promises = [];
        for (const set of fileClassMap.values()) {
          for (const candidate of set) classes.add(candidate);
        }

        const c = await stitches.generate(classes);
        classes.clear();
        const excludes: string[] = [];

        root.walkAtRules(directiveMap.stitches, (rule) => {
          if (!rule.params) {
            const source = rule.source;
            const css = postcss.parse(c.css);
            css.walkDecls((declaration) => {
              declaration.source = source;
            });
            rule.replaceWith(css);
          }
        });
      },
    ],
  };
}

stitches.postcss = true;
stitches.default = stitches;

export default stitches;

if (typeof module !== 'undefined') {
  module.exports = stitches;
}
