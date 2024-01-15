import { createStitches } from '@jujst/stitches/core';

test('Universal with typing', () => {
  assertType<typeof createStitches>(createStitches);
});
