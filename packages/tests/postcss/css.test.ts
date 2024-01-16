import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { createStitches } from '../../stitches/src/core';
import { extractorCore } from '../../stitches/src/postcss/extractor/core';

const emptyFile = path.join(__dirname, 'empty', 'core.ts');
console.log(emptyFile);

describe('css() extraction', () => {
  const stitches = createStitches();

  test('inline', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        css({
          color: 'red',
        })()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB']);
  });

  test('inline with override', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        css({
          color: 'red',
        })({ css: { color: 'blue' } })`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });

  test('variable', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        const red = css({
          color: 'red',
        })
        
        red()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB']);
  });

  test('variable with override', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        const red = css({
          color: 'red',
        })
        
        red({ css: { color: 'blue' } })`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });

  test('object', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        const styles = {
          red: css({
            color: 'red',
          })
        }
        
        styles.red()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB']);
  });

  test('object with override', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css } from "@jujst/stitches/core";
        
        const styles = {
          red: css({
            color: 'red',
          })
        }
        
        styles.red({ css: { color: 'blue' }})`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });
});
