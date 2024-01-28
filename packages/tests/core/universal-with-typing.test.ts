import { createSutairu } from '@sutairu/core';
import { assertType, test } from 'vitest';

test('Universal with typing', () => {
  assertType<typeof createSutairu>(createSutairu);
});
