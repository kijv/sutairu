import type Stitches from '../../types/stitches';
import { createSutairu } from '../create';

let cachedConfig: Stitches;

export const getCachedConfig = () =>
  // biome-ignore lint/suspicious/noAssignInExpressions: I don't feel like this is a problem
  cachedConfig || (cachedConfig = createSutairu());
