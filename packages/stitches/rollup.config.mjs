// @ts-check
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import esbuild from 'rollup-plugin-esbuild';

const entries = [
  'src/core.ts',
  'src/config.ts',
  'src/react.ts',
  'src/postcss.ts',
];

const plugins = [
  esbuild({
    target: 'node18',
    treeShaking: true,
    minify: process.env.NODE_ENV === 'production' ?? false,
  }),
  nodeResolve({ preferBuiltins: true }),
  commonjs(),
  json({
    preferConst: true,
  }),
];

const external = [
  'vite',
  'react',
  'magic-string',
  'unconfig',
  'postcss',
  'postcss-discard-empty',
  'postcss-nested',
  'jiti',
  '@swc/wasm',
];

export default defineConfig([
  {
    input: [...entries],
    output: [
      {
        dir: 'dist',
        format: 'esm',
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
      bundleSizeLimit(process.env.NODE_ENV === 'production' ? 163 : 500),
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
