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
  commonjs({
    ignoreDynamicRequires: true,
  }),
  json({
    preferConst: true,
  }),
];

export const external = [
  '@swc/wasm',
  'jiti',
  'chokidar',
  'tsconfig',
  'tsconfig-paths',
];

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
      },
    ],
    plugins: [...plugins],
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
