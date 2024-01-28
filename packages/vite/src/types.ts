import type { UserConfig } from '@sutairu/plugin';

export interface VitePluginConfig extends UserConfig {
  /**
   * Use top level await in HMR code to avoid FOUC on dev time.
   *
   * You usually don't need to disable this, unless you are developing on
   * a browser that does not support top level await.
   *
   * This will only affect on dev time.
   *
   * @default true
   */
  hmrTopLevelAwait?: boolean;
}
