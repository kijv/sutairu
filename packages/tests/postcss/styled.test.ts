import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { extractorCore } from '../../stitches/src/postcss/extractor/core';
import { createStitches } from '../../stitches/src/react';

const emptyFile = path.join(__dirname, 'empty', 'react.tsx');

describe('styled() extraction', () => {
  const stitches = createStitches();

  test('inline', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { styled } from "@jujst/stitches/react";
        
        styled('div', { 
          color: 'red' 
        })()`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "c-gmqXFB",
      ]
    `);
  });

  test('inline with override', async () => {
    const extracted = await extractorCore.extract!({
      code: `
      import { styled } from "@jujst/stitches/react";
        
      styled('div', { 
        color: 'red' 
      })({ 
        css: { color: 'blue' } 
      })`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot();
  });

  test('variable', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { styled } from "@jujst/stitches/core";

        const Red = styled('div', {
          color: 'red',
        })

        const Component = () => <Red />`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "c-gmqXFB",
      ]
    `);
  });

  test('variable with override', async () => {
    const extracted = await extractorCore.extract!({
      code: `
        import { styled } from "@jujst/stitches/core";

        const Red = styled('div', {
          color: 'red',
        })

        const Component = () => <Red css={{ color: 'blue' }} />`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot();
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

        const Component = () => <styles.red />`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot(`
      [
        "c-gmqXFB",
      ]
    `);
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

        const Component = () => <styles.red css={{ color: 'blue' }} />`,
      id: emptyFile,
      stitches,
      configFileList: [],
      original: '',
      extracted: new Set<string>(),
    });

    expect(extracted).toMatchInlineSnapshot();
  });
});
