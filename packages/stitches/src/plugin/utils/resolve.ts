import path from 'node:path';
import { fileURLToPath } from 'url';

/**
 * Get the directory of a file
 *
 * @example dir(import.meta)
 */
export function dir(meta: {
  url: string;
}) {
  return path.dirname(fileURLToPath(meta.url));
}

/**
 * Resolve path relative to process or imported file
 *
 * @example resolve('path/to/file.txt')
 * @example resolve(import.meta, 'path/to/file.txt')
 * @example resolve(import.meta, 'folder', 'file.txt')
 */
export function resolve(base: { url: string } | string, ...paths: string[]) {
  return typeof base === 'object' && base?.url
    ? path.resolve(dir(base), ...paths)
    : path.resolve(...paths);
}
