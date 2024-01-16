import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createStitches } from '../../../stitches/src/core';
import { extractorCore } from '../../../stitches/src/postcss/extractor/core';

const emptyFile = path.join(__dirname, 'empty', 'core.ts');

describe('unary expr (negative numbers)', () => {
  const stitches = createStitches();

  it('should work', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        css({
          zIndex: -1,
        })()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "c-dbpWbT",
      ]
    `);
  });
});
