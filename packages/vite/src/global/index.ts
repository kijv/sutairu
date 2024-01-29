import type { SutairuPluginContext } from '@sutairu/plugin';
import { GlobalModeBuildPlugin } from './build';
import { GlobalModeDevPlugin } from './dev';

export * from './dev';
export * from './build';

export function GlobalModePlugin(ctx: SutairuPluginContext) {
  return [...GlobalModeBuildPlugin(ctx), ...GlobalModeDevPlugin(ctx)];
}
