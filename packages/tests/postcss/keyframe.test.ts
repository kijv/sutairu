import path from 'node:path';
import { createStitches } from '@jujst/stitches/core';
import { describe, expect, test } from 'vitest';
import { extractorCore } from '../../stitches/src/postcss/extractor/core';

const emptyFile = path.join(__dirname, 'empty', 'core.ts');

describe('keyframe() extraction', () => {
  const stitches = createStitches();

  test('inline', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { keyframes } from "@jujst/stitches/core";
        
        keyframes({
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
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
        "k-fhCilR",
      ]
    `);
  });

  test('variable', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { keyframes } from "@jujst/stitches/core";
        
        const rotate = keyframes({
          from: {
            transform: 'rotate(0deg)',
          },
          to: {
            transform: 'rotate(360deg)',
          }
        })
        
        rotate()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "k-fhCilR",
      ]
    `);
  });

  test('object', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { keyframes } from "@jujst/stitches/core";
        
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
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "k-fhCilR",
      ]
    `);
  });

  test('using inside object should render and replace with name', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { css, keyframes } from "@jujst/stitches/core";
          
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
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "k-fhCilR",
        "c-bHkFfE",
      ]
    `);
  });
});
