import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { extractorAll } from '../../plugin/src/extractor';

const root = path.join(__dirname, 'mock');
const id = path.join(__dirname, 'mock', 'core.ts');
const sutairuPath = path.join(__dirname, 'sutairu.config.ts');

describe('css() extraction', () => {
  test('inline', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        css({
          color: 'red',
        })()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB']);
  });

  test('inline with override', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        css({
          color: 'red',
        })({ css: { color: 'blue' } })`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });

  test('variable', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        const red = css({
          color: 'red',
        })
        
        red()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB']);
  });

  test('variable with override', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        const red = css({
          color: 'red',
        })
        
        red({ css: { color: 'blue' } })`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });

  test('object', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        const styles = {
          red: css({
            color: 'red',
          })
        }
        
        styles.red()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB']);
  });

  test('object with override', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css } from "@sutairu/core";
        
        const styles = {
          red: css({
            color: 'red',
          })
        }
        
        styles.red({ css: { color: 'blue' }})`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });
});
