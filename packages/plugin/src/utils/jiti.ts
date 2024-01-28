import { fileURLToPath } from 'node:url';
import { transformSync } from '@swc/wasm';
import jitiFactory from 'jiti';

let jiti: ReturnType<typeof jitiFactory> | null = null;

const __filename =
  typeof module !== 'undefined'
    ? module.filename
    : fileURLToPath(import.meta.url);

export function lazyJiti(filename: string = __filename) {
  jiti ??= jitiFactory(filename, {
    transform: (opts) =>
      transformSync(opts.source, {
        jsc: { parser: { tsx: true, syntax: 'typescript' } },
        module: {
          type: 'commonjs',
        },
      }),
    interopDefault: true,
    cache: false,
    v8cache: false,
    esmResolve: true,
    requireCache: true,
  });

  return jiti;
}
