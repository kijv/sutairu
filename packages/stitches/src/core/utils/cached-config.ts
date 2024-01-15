import { createStitches } from '../create';
import type Stitches from '../types/stitches';

let cachedConfig: Stitches;

export const getCachedConfig = () =>
  // biome-ignore lint/suspicious/noAssignInExpressions: I don't feel like this is a problem
  cachedConfig || (cachedConfig = createStitches());
