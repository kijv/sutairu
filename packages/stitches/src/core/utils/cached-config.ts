import { createStitches } from '../create';

let cachedConfig: any;

export const getCachedConfig = (): any =>
  // biome-ignore lint/suspicious/noAssignInExpressions: I don't feel like this is a problem
  cachedConfig || (cachedConfig = createStitches());
