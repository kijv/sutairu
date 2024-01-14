import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { parse } from '@swc/wasm';
import type * as SWC from '@swc/wasm';
import { CSS } from '../../../core';
import { stitchesError } from '../../../stitches-error';
import { DUMMY_SP, expressionToJSON } from '../../ast/util';
import { visit } from '../../ast/visit';
import { JS_TYPES_RE } from '../../constants';
import { Extractor } from '../../types';
import { extractVariablesAndImports } from './vars';

export type State = {
  // TODO improve type performance
  stitches: any;
  ast: SWC.Program;
  id: string;
  configFileList: string[];
  loaders: string[];
};

const fileToAST = async (file: string) => {
  const fileContent = await readFile(file, 'utf8');
  const ext = extname(file);
  const tsx = ext.endsWith('tsx');
  const ts = ext.endsWith('ts');
  const jsx = ext.endsWith('jsx');

  return parse(fileContent, {
    syntax: tsx || ts ? 'typescript' : 'ecmascript',
    jsx,
    tsx,
  });
};

export const extractorCore: Extractor = {
  name: '@jujst/stitches/extractor-core',
  order: 0,
  async extract({ code, id, stitches, configFileList }) {
    if (!id || !JS_TYPES_RE.test(id)) return;

    const tokens: string[] = [];
    const ast = await fileToAST(id);

    let loaders = [
      '@jujst/stitches/react',
      '@jujst/stitches/core',
      ...configFileList,
    ];

    const cjsResolved = loaders
      .map((loader) => {
        try {
          return require.resolve(loader);
        } catch {
          return false;
        }
      })
      .filter(Boolean) as string[];

    const mjsResolved = cjsResolved.map((loader) => {
      const ext = extname(loader);

      try {
        if (ext === '.cjs') {
          // attempt to also find a .mjs file
          return require.resolve(loader.replace(/\.cjs$/, '.mjs'));
        }
        if (ext === '.cts') {
          // attempt to also find a .mts file
          return require.resolve(loader.replace(/\.cts$/, '.mts'));
        }

        return false;
      } catch {
        return false;
      }
    });

    loaders = [...loaders, ...cjsResolved, ...mjsResolved].filter(
      Boolean,
    ) as string[];

    const { variables, imports } = extractVariablesAndImports({
      ast,
      loaders,
      id,
      configFileList,
      stitches,
    });

    const registerStitchesCall = (
      args: SWC.Argument[],
      origin: {
        parents: {
          kind: string;
          index: number;
          args: unknown[];
        }[];
        args: unknown[];
        kind: string;
      },
    ) => {
      if (!origin.kind) return;

      let render;

      switch (origin.kind) {
        case 'css':
          render = stitches.css(
            ...origin.args.map((arg: any, index) => {
              const maybeParent = origin.parents.find((p) => p.index === index);
              if (maybeParent) {
                switch (maybeParent.kind) {
                  case 'css':
                    return stitches.css(arg);
                  case 'styled':
                    // @ts-expect-error
                    return stitches.styled(arg);
                }
              }

              return arg;
            }),
          );
          break;
        case 'keyframes':
          render = stitches.keyframes(origin.args[0] as CSS);
          break;
        case 'globalCss':
          render = stitches.globalCss(origin.args[0] as CSS[]);
          break;
        case 'styled':
          // @ts-expect-error React version specific
          render = stitches.styled(
            ...origin.args.map((arg: any, index) => {
              const maybeParent = origin.parents.find((p) => p.index === index);
              if (maybeParent) {
                switch (maybeParent.kind) {
                  case 'css':
                    return stitches.css(arg);
                  case 'styled':
                    // @ts-expect-error
                    return stitches.styled(arg);
                }
              }

              return arg;
            }),
          );
          break;
      }

      if (!render) return;

      const renderParents: {
        kind: string;
        index: number;
        args: unknown[];
      }[] = [];

      const renderArgs = args.flatMap((exprOrSpread, index) => {
        if (exprOrSpread.spread) {
          stitchesError(
            'No support for spreads in functions',
          );
        }

        const { expression } = exprOrSpread;

        if (expression.type === 'Identifier') {
          const maybeParent = variables.find(
            (i) =>
              i.name === expression.value && i.ctxt === expression.span.ctxt,
          );
          if (maybeParent) {
            renderParents.push({
              kind: maybeParent.kind,
              index,
              args: maybeParent.args,
            });
          }
        }

        return expressionToJSON(exprOrSpread.expression);
      });

      const value = render(
        ...renderArgs.map((arg, index) => {
          const maybeParent = origin.parents.find((p) => p.index === index);
          if (maybeParent) {
            switch (maybeParent.kind) {
              case 'css':
                return stitches.css(arg);
              case 'styled':
                // @ts-expect-error
                return stitches.styled(arg);
            }
          }

          return arg;
        }),
      );

      tokens.push(value.className);
    };

    const visitExpressionStatement = async (
      exprStmnt: SWC.ExpressionStatement | SWC.JSXExpressionContainer,
    ) => {
      const { expression } = exprStmnt;
      if (expression.type !== 'CallExpression') return;

      const { callee } = expression;

      if (
        callee.type !== 'Identifier' &&
        callee.type !== 'CallExpression' &&
        callee.type !== 'MemberExpression'
      )
        return;

      const origin: {
        parents: {
          kind: string;
          index: number;
          args: unknown[];
        }[];
        args: unknown[];
        kind: string;
      } = {
        parents: [],
        args: [],
        kind: '',
      };

      if (callee.type === 'Identifier') {
        let maybeOrigin = variables.find(
          (c) => c.name === callee.value && c.ctxt === callee.span.ctxt,
        );

        if (
          !maybeOrigin &&
          Array.from(imports).some(
            (i) => i.ctxt === expression.span.ctxt && i.value === callee.value,
          )
        ) {
          const maybeImport = imports.find(
            (i) => i.ctxt === expression.span.ctxt && i.value === callee.value,
          );
          if (!maybeImport) return;

          try {
            const { variables: foreignVariables } = extractVariablesAndImports({
              ast: await fileToAST(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
            });

            maybeOrigin = foreignVariables.find(
              (c) => c.name === callee.value && c.exported === true,
            );
          } catch {}
        }
        if (!maybeOrigin) return;

        const { kind, args, parents } = maybeOrigin;
        origin.kind = kind;
        origin.args = args;
        origin.parents = parents;
      } else if (callee.type === 'CallExpression') {
        // TODO add support for direct calls (ex. css(...)())
      } else if (callee.type === 'MemberExpression') {
        const { property, object } = callee;

        if (property.type !== 'Identifier') return;
        if (object.type !== 'Identifier') return;

        let maybeOrigin = variables.find(
          (c) => c.name === property.value && c.ctxt === property.span.ctxt,
        );

        if (
          !maybeOrigin &&
          Array.from(imports).some(
            (i) => i.ctxt === callee.span.ctxt && i.value === object.value,
          )
        ) {
          const maybeImport = imports.find(
            (i) => i.ctxt === callee.span.ctxt && i.value === object.value,
          );
          if (!maybeImport) return;

          try {
            const { variables: foreignVariables } = extractVariablesAndImports({
              ast: await fileToAST(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
            });

            maybeOrigin = foreignVariables.find(
              (c) => c.name === property.value && c.exported === true,
            );
          } catch {}
        }
        if (!maybeOrigin) return;

        const { kind, args, parents } = maybeOrigin;
        origin.kind = kind;
        origin.args = args;
        origin.parents = parents;
      }

      registerStitchesCall(expression.arguments, origin);
    };

    await visit(ast, {
      visitExpressionStatement,
      visitJSXExpressionContainer: visitExpressionStatement,
      visitCallExpression: (callExpr) =>
        visitExpressionStatement({
          type: 'ExpressionStatement',
          expression: callExpr,
          span: DUMMY_SP,
        }),
    });

    return tokens;
  },
};
