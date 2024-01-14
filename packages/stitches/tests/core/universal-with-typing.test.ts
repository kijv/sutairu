import { createStitches } from '../../src/core';

test('Universal with typing', () => {
  assertType<typeof createStitches>(createStitches);
});
