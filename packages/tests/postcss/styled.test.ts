import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { extractorAll } from '../../plugin/src/extractor';

const root = path.join(__dirname, 'mock');
const id = path.join(__dirname, 'mock', 'react.tsx');
const sutairuPath = path.join(__dirname, 'sutairu.config.ts');

describe('styled() extraction', () => {
  test('inline', async () => {
    const extracted = await extractorAll.extract!({
      code: `
        import { styled } from "@sutairu/react";
        
        styled('div', { 
          color: 'red' 
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
      import { styled } from "@sutairu/react";
        
      styled('div', { 
        color: 'red' 
      })({ 
        css: { color: 'blue' } 
      })`,
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
        import { styled } from "@sutairu/react";

        const Red = styled('div', {
          color: 'red',
        })

        const Component = () => <Red />`,
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
        import { styled } from "@sutairu/react";

        const Red = styled('div', {
          color: 'red',
        })

        const Component = () => <Red css={{ color: 'blue' }} />`,
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
        import { styled } from "@sutairu/react";

        const styles = {
          red: styled('div', {
            color: 'red',
          })
        }

        const Component = () => <styles.red />`,
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
        import { styled } from "@sutairu/react";

        const styles = {
          red: styled('div', {
            color: 'red',
          })
        }

        const Component = () => <styles.red css={{ color: 'blue' }} />`,
      original: '',
      extracted: new Set<string>(),
      root,
      id,
      sutairuPath,
    });

    expect(extracted?.tokens).toStrictEqual(['c-gmqXFB c-gmqXFB-ikydkiA-css']);
  });
});
