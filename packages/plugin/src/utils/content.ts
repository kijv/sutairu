import fs from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import fg from 'fast-glob';
import type { SutairuPluginContext } from '../types';

export async function setupContentExtractor(
  ctx: SutairuPluginContext,
  shouldWatch = false,
) {
  const { content } = await ctx.getConfig();
  const { extract, tasks, root, filter } = ctx;

  // filesystem
  if (content?.filesystem) {
    const files = await fg(content.filesystem, { cwd: root });

    async function extractFile(file: string) {
      file = isAbsolute(file) ? file : resolve(root, file);
      const code = await fs.readFile(file, 'utf-8');
      if (!filter(code, file)) return;

      return await extract(code || code, file);
    }

    if (shouldWatch) {
      const { watch } = await import('chokidar');
      const ignored = ['**/{.git,node_modules}/**'];

      const watcher = watch(files, {
        ignorePermissionErrors: true,
        ignored,
        cwd: root,
        ignoreInitial: true,
      });

      watcher.on('all', (type, file) => {
        if (type === 'add' || type === 'change') {
          const absolutePath = resolve(root, file);
          tasks.push(extractFile(absolutePath));
        }
      });
    }

    await Promise.all(files.map(extractFile));
  }
}
