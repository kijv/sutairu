import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { extractorAll } from '../../../plugin/src/extractor';

const root = path.join(__dirname, '..', 'mock');
const id = path.join(__dirname, '..', 'mock', 'core.ts');
const sutairuPath = path.join(__dirname, 'sutairu.config.ts');

describe('unary expr (negative numbers)', () => {
  it('should work', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        css({
          zIndex: -1,
        })()`,
      original: '',
      extracted: new Set<string>(),
      dependencies: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-dbpWbT']);
  });
});
