import { createStitches } from '@jujst/stitches/core';
import { assertType, test } from 'vitest';

test('Universal with typing', () => {
  assertType<typeof createStitches>(createStitches);
});
