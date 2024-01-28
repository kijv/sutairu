import process from 'node:process';
import {
  type SutairuPluginContext,
  type UserConfigDefaults,
  createContext,
  sutairuError,
} from '@sutairu/plugin';
import type { PluginOption } from 'vite';
import { GlobalModePlugin } from './global';
import type { VitePluginConfig } from './types';

export interface SutairuVitePluginAPI {
  getContext(): SutairuPluginContext<VitePluginConfig>;
}

export default function SutairuPlugin(
  config: VitePluginConfig,
  defaults: UserConfigDefaults = {
    content: {
      include: [],
    },
  },
): PluginOption {
  if (config == null) {
    sutairuError('Missing config parameter when initializing Sutairu plugin');
  }
  const ctx = createContext<VitePluginConfig>(config as any, {
    envMode: process.env.NODE_ENV === 'development' ? 'dev' : 'build',
    ...defaults,
  });

  const plugins = [
    ...GlobalModePlugin(ctx),
    {
      name: 'sutairu:api',
      api: <SutairuVitePluginAPI>{
        getContext: () => ctx,
      },
    },
  ];

  return plugins.filter(Boolean) as PluginOption;
}
