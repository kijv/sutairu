import { UserConfig } from '../plugin/config/types';

export interface StitchesPostcssPluginOptions {
  content?: (
    | string
    | {
        raw: string;
        extension: string;
      }
  )[];
  directiveMap?: {
    stitches?: string;
  };
  cwd?: string;
  configOrPath?: string | UserConfig;
}
