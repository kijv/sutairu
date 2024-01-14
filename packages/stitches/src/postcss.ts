import { default as postcss } from './postcss/plugin';
import { defineConfig } from './postcss/plugin';

export * from './postcss/plugin';
export default postcss;

if (typeof module !== 'undefined') {
  module.exports = postcss;
  module.exports.defineConfig = defineConfig;
}
