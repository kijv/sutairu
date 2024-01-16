import path from 'node:path';
import { createStitches } from '@jujst/stitches/core';
import { describe, expect, test } from 'vitest';
import { extractorCore } from '../../stitches/src/postcss/extractor/core';

const emptyFile = path.join(__dirname, 'empty', 'core.ts');

describe('globalCss() extraction', () => {
  const stitches = createStitches();

  test('inline', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { globalCss } from "@jujst/stitches/core";
        
        globalCss({
          html: {
            color: 'red',
          }
        })()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "",
      ]
    `);
  });

  test('variable', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { globalCss } from "@jujst/stitches/core";
        
        const red = globalCss({
          html: {
            color: 'red',
          }
        })
        
        red()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "",
      ]
    `);
  });

  test('object', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { globalCss } from "@jujst/stitches/core";
        
        const styles = {
          red: globalCss({
            html: {
              color: 'red',
            }
          })
        }
        
        styles.red()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "",
      ]
    `);
  });
});
