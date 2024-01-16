import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';
import sharedConfig from '../shared.config';

export default mergeConfig(sharedConfig, {
  plugins: [react()],
});
