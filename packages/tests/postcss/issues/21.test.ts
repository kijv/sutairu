import path from 'node:path';
import { describe, expect, it, suite } from 'vitest';
import { createStitches } from '../../../stitches/src/core';
import { extractorCore } from '../../../stitches/src/postcss/extractor/core';

const sampleFile = path.join(__dirname, 'react.tsx');

suite('Issue #21', () => {
  describe('themes not rendering in jsx', () => {
    const stitches = createStitches();

    // TODO: Make this work
    // Let them use `createStitches` and use defaults for PostCSS Config
    it.fails('theme is imported', async () => {
      const extracted = await extractorCore.extract!({
        code: `
        import { theme } from "./stitches.config";

        const Component = () => <div className={theme.className} />;
        Component()
        `,
        id: sampleFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toMatchInlineSnapshot(`
        [
          "t-iknykm",
        ]
      `);
    });
  });
});
