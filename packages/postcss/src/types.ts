import type { UserConfig } from '@sutairu/plugin';

export type SutairuPostcssPluginOptions = Omit<
  UserConfig,
  'configDeps' | 'configResolved'
> & {
  directiveMap?: {
    sutiaru?: string;
  };
};
