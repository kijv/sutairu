import path from 'node:path';
import { describe, expect, suite, test } from 'vitest';
import { createStitches } from '../../stitches/src/core';
import { extractorCore } from '../../stitches/src/postcss/extractor/core';

const emptyFile = path.join(__dirname, 'empty', 'core.ts');

suite('createTheme() extraction', () => {
  const stitches = createStitches();

  describe('variable', async () => {
    const def = `
    import { createTheme } from "@jujst/stitches/core";

    const theme = createTheme({
      colors: {
        foreground: 'red',
      }
    })
    
    theme`;

    test('no call, just defining it', async () => {
      const extracted = await extractorCore.extract!({
        code: def,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual([]);
    });

    test('toString()', async () => {
      const extracted = await extractorCore.extract!({
        code: `${def}.toString();`,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });

    test('className', async () => {
      const extracted = await extractorCore.extract!({
        code: `${def}.className;`,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });

    test('String primitive', async () => {
      const extracted = await extractorCore.extract!({
        code: def.replace(/theme$/g, 'String(theme)'),
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });
  });

  describe('object', async () => {
    const def = `
    import { createTheme } from "@jujst/stitches/core";

    const styles = {
      theme: createTheme({
        colors: {
          foreground: 'red',
          }
      })
    }
    
    styles.theme`;

    test('no call, just defining it', async () => {
      const extracted = await extractorCore.extract!({
        code: def,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual([]);
    });

    test('toString()', async () => {
      const extracted = await extractorCore.extract!({
        code: `${def}.toString();`,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });

    test('className', async () => {
      const extracted = await extractorCore.extract!({
        code: `${def}.className;`,
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });

    test('String primitive', async () => {
      const extracted = await extractorCore.extract!({
        code: def.replace(/styles.theme$/g, 'String(styles.theme)'),
        id: emptyFile,
        stitches,
        configFileList: [],
        original: '',
        extracted: new Set<string>(),
      });

      expect(extracted).toStrictEqual(['t-bdqcWd']);
    });
  });
});
