import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { extractorAll } from '../../plugin/src/extractor';

const root = path.join(__dirname, 'mock');
const id = path.join(__dirname, 'mock', 'core.ts');
const sutairuPath = path.join(__dirname, 'sutairu.config.ts');

describe('globalCss() extraction', () => {
  test('inline', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { globalCss } from "@sutairu/core";
        
        globalCss({
          html: {
            color: 'red',
          }
        })()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['']);
  });

  test('variable', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { globalCss } from "@sutairu/core";
        
        const red = globalCss({
          html: {
            color: 'red',
          }
        })
        
        red()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['']);
  });

  test('object', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { globalCss } from "@sutairu/core";
        
        const styles = {
          red: globalCss({
            html: {
              color: 'red',
            }
          })
        }
        
        styles.red()`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['']);
  });
});
