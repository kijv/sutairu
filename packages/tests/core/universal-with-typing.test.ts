import { createStitches } from '../../stitches/src/core';

test('Universal with typing', () => {
  assertType<typeof createStitches>(createStitches);
});
