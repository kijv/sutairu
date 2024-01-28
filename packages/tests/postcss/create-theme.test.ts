import path from 'node:path';
import { describe, expect, suite, test } from 'vitest';
import { extractorAll } from '../../plugin/src/extractor';

const root = path.join(__dirname, 'mock');
const id = path.join(__dirname, 'mock', 'core.ts');
const sutairuPath = [path.join(__dirname, 'mock', 'core.config.ts')];

suite('createTheme() extraction', () => {
  describe('variable', async () => {
    const def = `
    import { createTheme } from "@sutairu/core";

    const theme = createTheme({
      colors: {
        foreground: 'red',
      }
    })
    
    theme`;

    test('no call, just defining it', async () => {
      const extracted = await extractorAll.extract!({
        code: def,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual([]);
    });

    test('toString()', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.toString();`,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('className', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.className;`,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('String primitive', async () => {
      const extracted = await extractorAll.extract!({
        code: def.replace(/theme$/g, 'String(theme)'),
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });
  });

  describe('object', async () => {
    const def = `
    import { createTheme } from "@sutairu/core";

    const styles = {
      theme: createTheme({
        colors: {
          foreground: 'red',
          }
      })
    }
    
    styles.theme`;

    test('no call, just defining it', async () => {
      const extracted = await extractorAll.extract!({
        code: def,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual([]);
    });

    test('toString()', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.toString();`,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('className', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.className;`,
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('String primitive', async () => {
      const extracted = await extractorAll.extract!({
        code: def.replace(/styles.theme$/g, 'String(styles.theme)'),
        original: '',
        extracted: new Set<string>(),
        root,
        id,
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });
  });

  describe('custom config', async () => {
    const def = `
    import { createSutairu } from "@sutairu/core";
    const { createTheme } = createSutairu({})

    const styles = {
      theme: createTheme({
        colors: {
          foreground: 'red',
          }
      })
    }
    
    styles.theme`;

    test('no call, just defining it', async () => {
      const extracted = await extractorAll.extract!({
        code: def,
        original: '',
        extracted: new Set<string>(),
        root,
        id: sutairuPath[0],
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual([]);
    });

    test('toString()', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.toString();`,
        original: '',
        extracted: new Set<string>(),
        root,
        id: sutairuPath[0],
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('className', async () => {
      const extracted = await extractorAll.extract!({
        code: `${def}.className;`,
        original: '',
        extracted: new Set<string>(),
        root,
        id: sutairuPath[0],
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });

    test('String primitive', async () => {
      const extracted = await extractorAll.extract!({
        code: def.replace(/styles.theme$/g, 'String(styles.theme)'),
        original: '',
        extracted: new Set<string>(),
        root,
        id: sutairuPath[0],
        sutairuPath,
      });

      expect(extracted?.tokens).toStrictEqual(['t-bdqcWd']);
    });
  });
});
