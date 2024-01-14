// picomatch patterns, used with rollup's createFilter
export const defaultPipelineExclude = [];
export const defaultPipelineInclude = [
  /\.(vue|svelte|[jt]sx|astro)($|\?)/,
];

// micromatch patterns, used in postcss plugin
export const defaultFilesystemGlobs = [
  '**/*.{js,ts,jsx,tsx,vue,svelte,astro}',
];
