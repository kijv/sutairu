import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { extractorAll } from '../../plugin/src/extractor';

const root = path.join(__dirname, 'mock');
const id = path.join(__dirname, 'mock', 'core.ts');
const sutairuPath = path.join(__dirname, 'sutairu.config.ts');

describe('keyframe() extraction', () => {
  test('inline', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { keyframes } from "@sutairu/core";
        
        keyframes({
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          }
        })()`,
      original: '',
      extracted: new Set<string>(),
      dependencies: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['k-fhCilR']);
  });

  test('variable', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { keyframes } from "@sutairu/core";
        
        const rotate = keyframes({
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          }
        })
        
        rotate()`,
      original: '',
      extracted: new Set<string>(),
      dependencies: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['k-fhCilR']);
  });

  test('object', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { keyframes } from "@sutairu/core";
        
        const styles = {
          rotate: keyframes({
            from: {
              transform: 'rotate(0deg)',
            },
            to: {
              transform: 'rotate(360deg)',
            }
          })
        }
        
        styles.rotate()`,
      original: '',
      extracted: new Set<string>(),
      dependencies: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['k-fhCilR']);
  });

  test('using inside object should render and replace with name', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { css, keyframes } from "@sutairu/core";
          
        const rotate = keyframes({
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          }
        });
        const spin = css({
          animation: \`\${rotate} 1s linear infinite\`,
        })
        
        spin()`,
      original: '',
      extracted: new Set<string>(),
      dependencies: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['k-fhCilR', 'c-bHkFfE']);
  });
});
