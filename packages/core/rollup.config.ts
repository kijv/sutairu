import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { createMinifier } from 'dts-minify';
import type { Plugin } from 'rollup';
import { defineConfig } from 'rollup';
import dts from 'rollup-plugin-dts';
import swc from 'rollup-plugin-swc3';
import * as ts from 'typescript';

// @ts-expect-error
const minifier = createMinifier(ts.default);

const entries = ['src/index.ts'];

const plugins = [
  swc({
    minify: process.env.NODE_ENV === 'production' ?? false,
    jsc: {
      target: 'es2022',
    },
    module: {
      importInterop: 'swc',
      type: 'es6',
    },
  }),
  nodeResolve({ preferBuiltins: true }),
  commonjs(),
  json({
    preferConst: true,
  }),
];

const external = [];

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
      {
        name: 'dts-minify',
        renderChunk(code) {
          return minifier.minify(code, {
            keepJsDocs: true,
          });
        },
        transform(code, id) {
          if (id.endsWith('.d.ts')) {
            return minifier.minify(code, {
              keepJsDocs: true,
            });
          }
        },
      },
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
 */
function bundleSizeLimit(limit: number): Plugin {
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
