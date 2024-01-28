// @ts-check
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import swc from 'rollup-plugin-swc3';

const entries = ['src/index.ts'];

const plugins = [
  swc({
    minify: process.env.NODE_ENV === 'production' ?? false,
    jsc: {
      target: undefined,
    },
    module: {
      importInterop: 'swc',
      type: 'es6',
    },
    env: {
      targets: 'node 18',
    },
  }),
  nodeResolve({ preferBuiltins: true }),
  commonjs(),
  json({
    preferConst: true,
  }),
];

const external = ['react'];

export default defineConfig([
  {
    input: [...entries],
    output: [
      {
        dir: 'dist',
        chunkFileNames: 'chunks/[name].mjs',
        entryFileNames: (f) =>
          `${f.facadeModuleId
            ?.replace(/^.*src[\\\/]/, '')
            .replace(/\.[^\.]+$/, '')}.mjs`,
      },
      {
        dir: 'dist',
        format: 'cjs',
        chunkFileNames: 'chunks/cjs/[name].cjs',
        entryFileNames: (f) =>
          `${f.facadeModuleId
            ?.replace(/^.*src[\\\/]/, '')
            .replace(/\.[^\.]+$/, '')}.cjs`,
        exports: 'named',
      },
    ],
    plugins: [
      ...plugins,
      process.env.NODE_ENV === 'production' && bundleSizeLimit(163),
    ],
    external: [...external],
  },
  {
    input: [...entries],
    output: [
      {
        dir: 'dist',
        format: 'esm',
        chunkFileNames: 'types/[name].d.ts',
        entryFileNames: (f) => `${f.name.replace(/src[\\\/]/, '')}.d.ts`,
      },
    ],
    plugins: [
      dts({
        respectExternal: true,
      }),
    ],
    external: [...external],
  },
]);

/**
 * Guard the bundle size
 *
 * @param {number} limit size in kB
 * @return {import('rollup').Plugin}
 */
function bundleSizeLimit(limit) {
  return {
    name: 'bundle-limit',
    generateBundle(options, bundle) {
      const size = Buffer.byteLength(
        Object.values(bundle)
          .map((i) => ('code' in i ? i.code : ''))
          .join(''),
        'utf-8',
      );
      const kb = size / 1000;
      if (kb > limit) {
        throw new Error(
          `Bundle size exceeded ${limit} kB, current size is ${kb.toFixed(
            2,
          )}kb.`,
        );
      }
    },
  };
}
