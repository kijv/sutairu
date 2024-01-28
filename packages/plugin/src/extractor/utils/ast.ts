import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import type * as SWC from '@swc/wasm';
import { parse } from '@swc/wasm';
import { expressionToJSON } from '../../ast/util';
import { sutairuError } from '../../utils/stitches-error';

const fileAstCache = new Map<
  string,
  {
    mtimeMs: number;
    ast: SWC.Program;
    code: string;
  }
>();

export const codeToAST = async (code: string, filepath: string) => {
  const { mtimeMs } = await stat(filepath);
  // const cached = fileAstCache.get(filepath);

  // // cached.code is used because tests refer the same file but with different
  // // content, so we need to invalidate the cache
  // if (cached && cached.mtimeMs === mtimeMs && cached.code === code) {
  //   return cached.ast;
  // }

  const ast = await parse(code, parserOptionsFromPath(filepath));

  fileAstCache.set(filepath, {
    mtimeMs,
    ast,
    code,
  });

  return ast;
};

export const fileToAST = async (filepath: string) => {
  const { mtimeMs } = await stat(filepath);

  // const cached = fileAstCache.get(filepath);

  // if (cached && cached.mtimeMs === mtimeMs) {
  //   return cached.ast;
  // }

  const fileContent = await readFile(filepath, 'utf8');
  const ast = await parse(fileContent, parserOptionsFromPath(filepath));

  fileAstCache.set(filepath, {
    mtimeMs,
    ast,
    code: fileContent,
  });

  return ast;
};

export const emptyASTCache = () => fileAstCache.clear();

const parserOptionsFromPath = (filepath: string): SWC.ParserConfig => {
  const ext = extname(filepath);
  const tsx = ext.endsWith('tsx');
  const ts = ext.endsWith('ts');
  const jsx = ext.endsWith('jsx');

  return {
    syntax: tsx || ts ? 'typescript' : 'ecmascript',
    jsx,
    tsx,
  };
};

export const jsonArguments = (args: SWC.Argument[]) =>
  args.map((exprOrSpread) => {
    if (exprOrSpread.spread) {
      sutairuError('No support for spreads in functions');
    }

    return expressionToJSON(exprOrSpread.expression);
  });
