import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import type { CSS } from '@stitches/core/src/index';
import Stitches from '@stitches/core/types/stitches';
import ReactStitches from '@stitches/react/types/stitches';
import { StyledComponent } from '@stitches/react/types/styled-component';
import { parse, parseSync } from '@swc/wasm';
import type * as SWC from '@swc/wasm';
import { DUMMY_SP, expressionToJSON } from '../../ast/util';
import { visitSync } from '../../ast/visit';
import { JS_TYPES_RE } from '../../constants';
import { stitchesError } from '../../stitches-error';
import { Extractor } from '../../types';
import { jsonArguments } from './utils';
import { EXTENDABLE_STYLE_FUNCTIONS, extractVariablesAndImports } from './vars';

function removeDups<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export type State = {
  stitches: Stitches | ReactStitches;
  ast: SWC.Program;
  id: string;
  code: string;
  configFileList: string[];
  loaders: string[];
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

    loaders = removeDups(
      [...loaders, ...cjsResolved, ...mjsResolved].filter(Boolean) as string[],
    );

    const { variables, imports } = extractVariablesAndImports({
      ast,
      loaders,
      id,
      configFileList,
      stitches,
      code,
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

      let render:
        | ReturnType<typeof stitches.keyframes>
        | ReturnType<typeof stitches.createTheme>
        | StyledComponent
        | undefined;

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
          render = (stitches as ReactStitches).styled(
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
        case 'createTheme':
          render = stitches.createTheme(
            origin.args[0] as string,
            origin.args[1] as {},
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
          stitchesError('No support for spreads in functions');
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

      if (origin.kind === 'createTheme') {
        String(render);
        return tokens.push(
          (render as ReturnType<typeof stitches.createTheme>).className,
        );
      }

      const value = (
        origin.kind === 'styled'
          ? // @ts-expect-error
            render.render
          : render
      )(
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

    const visitExpressionStatement = (
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
              ast: fileToASTSync(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
              code,
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
        const { callee: innerCallee } = callee;

        // createTheme
        if (
          innerCallee.type === 'Identifier' &&
          innerCallee.value === 'String' &&
          callee.arguments.length === 1
        ) {
          const firstArg = jsonArguments(callee.arguments)[0];
          if (typeof firstArg === 'string') {
            let maybeOrigin = variables.find(
              (c) => c.name === firstArg && c.ctxt === innerCallee.span.ctxt,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) => i.ctxt === innerCallee.span.ctxt && i.value === firstArg,
              )
            ) {
              const maybeImport = imports.find(
                (i) => i.ctxt === innerCallee.span.ctxt && i.value === firstArg,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  extractVariablesAndImports({
                    ast: fileToASTSync(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    configFileList,
                    stitches,
                    code,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === firstArg && c.exported === true,
                );
              } catch {}
            }

            if (!maybeOrigin) return;

            const { kind, args, parents } = maybeOrigin;
            origin.kind = kind;
            origin.args = args;
            origin.parents = parents;
          }
        }
        // inline calling
        else if (callee.type === 'CallExpression') {
          if (innerCallee.type !== 'Identifier') return;

          origin.kind = innerCallee.value;
          origin.args = callee.arguments.flatMap((exprOrSpread, index) => {
            if (exprOrSpread.spread) {
              stitchesError('No support for spreads in functions');
            }

            const { expression } = exprOrSpread;

            if (
              expression.type === 'Identifier' &&
              EXTENDABLE_STYLE_FUNCTIONS.includes(innerCallee.value)
            ) {
              const maybeParent = variables.find(
                (i) =>
                  i.name === expression.value &&
                  i.ctxt === expression.span.ctxt,
              );
              if (maybeParent) {
                origin.parents.push({
                  kind: maybeParent.kind,
                  index,
                  args: maybeParent.args,
                });
              }
            } else if (exprOrSpread.expression.type === 'ObjectExpression') {
              exprOrSpread.expression = visitSync(
                exprOrSpread.expression,
                {
                  visitComputed(node) {
                    const { expression } = node;
                    if (expression.type !== 'TemplateLiteral') return;

                    const { start } = expression.span;

                    const replaced: {
                      start: number;
                      end: number;
                      value: string;
                    }[] = [];
                    // put these in order based on their span.start and span.end
                    const order = [];

                    for (const expr of expression.expressions) {
                      if (expr.type !== 'Identifier') continue;

                      const maybeMatch = variables.find(
                        (v) =>
                          v.name === expr.value && v.ctxt === expr.span.ctxt,
                      );
                      if (!maybeMatch) continue;

                      const { args, kind } = maybeMatch;

                      if (kind === 'keyframes' && !!stitches) {
                        const replacement = stitches
                          .keyframes(args[0] as CSS)
                          .toString();
                        const { start, end } = expr.span;
                        replaced.push({ start, end, value: replacement });
                      } else if (kind === 'css') {
                        const replacement = stitches
                          .css(...(args as CSS[]))
                          .toString();
                        const { start, end } = expr.span;
                        replaced.push({ start, end, value: replacement });
                      } else continue;
                    }

                    for (const quasi of expression.quasis) {
                      order[quasi.span.start - start] = {
                        type: 'StringLiteral',
                        span: DUMMY_SP,
                        value: quasi.cooked,
                      };
                    }
                    for (const replace of replaced) {
                      order[replace.start - start] = {
                        type: 'StringLiteral',
                        span: DUMMY_SP,
                        value: replace.value,
                      };
                    }

                    return {
                      type: 'StringLiteral',
                      span: DUMMY_SP,
                      // @ts-expect-error
                      value: order.flatMap(expressionToJSON).join(''),
                    };
                  },
                  visitTemplateLiteral(expression) {
                    const { start } = expression.span;

                    const replaced: {
                      start: number;
                      end: number;
                      value: string;
                    }[] = [];
                    // put these in order based on their span.start and span.end
                    const order = [];

                    for (const expr of expression.expressions) {
                      if (expr.type !== 'Identifier') continue;

                      const maybeMatch = variables.find(
                        (v) =>
                          v.name === expr.value && v.ctxt === expr.span.ctxt,
                      );
                      if (!maybeMatch) continue;

                      const { args, kind } = maybeMatch;

                      if (kind === 'keyframes') {
                        const replacement = stitches
                          .keyframes(args[0] as CSS)
                          .toString();
                        const { start, end } = expr.span;
                        replaced.push({ start, end, value: replacement });
                      } else if (kind === 'css') {
                        const replacement = stitches
                          .css(...(args as CSS[]))
                          .toString();
                        const { start, end } = expr.span;
                        replaced.push({ start, end, value: replacement });
                      } else continue;
                    }

                    for (const quasi of expression.quasis) {
                      order[quasi.span.start - start] = {
                        type: 'StringLiteral',
                        span: DUMMY_SP,
                        value: quasi.cooked,
                      };
                    }
                    for (const replace of replaced) {
                      order[replace.start - start] = {
                        type: 'StringLiteral',
                        span: DUMMY_SP,
                        value: replace.value,
                      };
                    }

                    return {
                      type: 'StringLiteral',
                      span: DUMMY_SP,
                      // @ts-expect-error
                      value: order.flatMap(expressionToJSON).join(''),
                    };
                  },
                },
                true,
              );
            }

            return expressionToJSON(exprOrSpread.expression);
          });
        }
      } else if (callee.type === 'MemberExpression') {
        const { property, object } = callee;

        if (property.type !== 'Identifier') return;
        if (object.type !== 'Identifier') return;

        let maybeOrigin = variables.find(
          (c) => c.name === property.value && c.ctxt === property.span.ctxt,
        );

        // TODO cleanup this code duplication
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
              ast: fileToASTSync(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
              code,
            });

            maybeOrigin = foreignVariables.find(
              (c) => c.name === property.value && c.exported === true,
            );
          } catch {}
        }
        // createTheme
        if (!maybeOrigin && property.value === 'toString') {
          maybeOrigin = variables.find(
            (c) => c.name === object.value && c.ctxt === object.span.ctxt,
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
              const { variables: foreignVariables } =
                extractVariablesAndImports({
                  ast: fileToASTSync(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  configFileList,
                  stitches,
                  code,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === object.value && c.exported === true,
              );
            } catch {}
          }
        }

        if (!maybeOrigin) return;

        const { kind, args, parents } = maybeOrigin;
        origin.kind = kind;
        origin.args = args;
        origin.parents = parents;
      }

      registerStitchesCall(expression.arguments, origin);
    };

    await visitSync(ast, {
      visitExpressionStatement,
      visitJSXExpressionContainer: visitExpressionStatement,
      visitCallExpression: (callExpr) => {
        const { callee } = callExpr;

        // createTheme
        if (callee.type === 'Identifier' && callee.value === 'String') {
          const firstArg = callExpr.arguments[0];
          if (!firstArg) return;

          const { expression } = firstArg;
          if (expression.type !== 'Identifier') return;

          let maybeOrigin = variables.find(
            (c) =>
              c.name === expression.value && c.ctxt === expression.span.ctxt,
          );

          if (
            !maybeOrigin &&
            Array.from(imports).some(
              (i) =>
                i.ctxt === callExpr.span.ctxt && i.value === expression.value,
            )
          ) {
            const maybeImport = imports.find(
              (i) =>
                i.ctxt === callExpr.span.ctxt && i.value === expression.value,
            );
            if (!maybeImport) return;

            try {
              const { variables: foreignVariables } =
                extractVariablesAndImports({
                  ast: fileToASTSync(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  configFileList,
                  stitches,
                  code,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === expression.value && c.exported === true,
              );
            } catch {}
          }
          if (!maybeOrigin) return;

          const { kind, args, parents } = maybeOrigin;
          registerStitchesCall([], {
            kind,
            args,
            parents,
          });
        } else
          visitExpressionStatement({
            type: 'ExpressionStatement',
            expression: callExpr,
            span: DUMMY_SP,
          });
      },
      // styled
      visitJSXElement: (jsxEl) => {
        const { opening } = jsxEl;
        const openingName = opening.name;
        if (openingName.type !== 'Identifier') return;

        let maybeOrigin = variables.find(
          (c) =>
            c.name === openingName.value && c.ctxt === openingName.span.ctxt,
        );

        if (
          !maybeOrigin &&
          Array.from(imports).some(
            (i) =>
              i.ctxt === openingName.span.ctxt && i.value === openingName.value,
          )
        ) {
          const maybeImport = imports.find(
            (i) =>
              i.ctxt === openingName.span.ctxt && i.value === openingName.value,
          );
          if (!maybeImport) return;

          try {
            const { variables: foreignVariables } = extractVariablesAndImports({
              ast: fileToASTSync(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
              code,
            });

            maybeOrigin = foreignVariables.find(
              (c) => c.name === openingName.value && c.exported === true,
            );
          } catch {}
        }
        if (!maybeOrigin) return;

        const cssArg = opening.attributes.find(
          (attr) =>
            attr.type === 'JSXAttribute' &&
            attr.name.type === 'Identifier' &&
            attr.name.value === 'css',
        );

        const { kind, args, parents } = maybeOrigin;

        registerStitchesCall(
          [
            {
              spread: cssArg?.type === 'SpreadElement' ? DUMMY_SP : undefined,
              expression: {
                type: 'ObjectExpression',
                span: {
                  start: 6,
                  end: 27,
                  ctxt: 0,
                },
                properties:
                  cssArg?.type === 'JSXAttribute' && cssArg?.value
                    ? [
                        {
                          type: 'KeyValueProperty',
                          key: {
                            type: 'Identifier',
                            span: {
                              start: 10,
                              end: 13,
                              ctxt: 0,
                            },
                            value: 'css',
                            optional: false,
                          },
                          value:
                            cssArg?.type === 'JSXAttribute' && cssArg?.value
                              ? cssArg.value.type === 'JSXExpressionContainer'
                                ? cssArg.value.expression
                                : (cssArg.value as any)
                              : {},
                        },
                      ]
                    : [],
              },
            },
          ],
          {
            kind,
            args,
            parents,
          },
        );
      },
      // createTheme
      visitMemberExpression: (memberExpr) => {
        const { object, property } = memberExpr;
        if (object.type !== 'Identifier') return;
        if (property.type !== 'Identifier') return;
        if (property.value !== 'className') return;

        let maybeOrigin = variables.find(
          (c) => c.name === object.value && c.ctxt === object.span.ctxt,
        );

        if (
          !maybeOrigin &&
          Array.from(imports).some(
            (i) => i.ctxt === memberExpr.span.ctxt && i.value === object.value,
          )
        ) {
          const maybeImport = imports.find(
            (i) => i.ctxt === memberExpr.span.ctxt && i.value === object.value,
          );
          if (!maybeImport) return;

          try {
            const { variables: foreignVariables } = extractVariablesAndImports({
              ast: fileToASTSync(maybeImport.resolved),
              loaders,
              id: maybeImport.resolved,
              configFileList,
              stitches,
              code,
            });

            maybeOrigin = foreignVariables.find(
              (c) => c.name === object.value && c.exported === true,
            );
          } catch {}
        }
        if (!maybeOrigin) return;

        const { kind, args, parents } = maybeOrigin;
        registerStitchesCall([], {
          kind,
          args,
          parents,
        });
      },
    });

    return tokens;
  },
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

const fileToASTSync = (file: string) => {
  const fileContent = readFileSync(file, 'utf8');
  const ext = extname(file);
  const tsx = ext.endsWith('tsx');
  const ts = ext.endsWith('ts');
  const jsx = ext.endsWith('jsx');

  return parseSync(fileContent, {
    syntax: tsx || ts ? 'typescript' : 'ecmascript',
    jsx,
    tsx,
  });
};
