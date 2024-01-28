import { extname } from 'node:path';
import type * as swc from '@swc/wasm';
import picomatch from 'picomatch';
import type { CSS } from '../../../core/src/index';
import type Sutairu from '../../../core/types/stitches';
import type ReactSutairu from '../../../react/types/stitches';
import type { StyledComponent } from '../../../react/types/styled-component';
import { DUMMY_SP, expressionToJSON } from '../ast/util';
import { visit, visitSync } from '../ast/visit';
import type { Extractor, ResolvedConfig } from '../types';
import { lazyJiti } from '../utils';
import { sutairuError } from '../utils/sutairu-error';
import type { Import } from './shared/imports';
import {
  EXTENDABLE_STYLE_FUNCTIONS,
  STYLE_FUNCTIONS,
  type Variable,
  extractVariablesAndImports,
} from './shared/vars';
import { codeToAST, fileToAST, jsonArguments } from './utils/ast';
import { removeDups } from './utils/basic';

export const defaultAllFileRE = picomatch.makeRe(
  '*.{js,ts,cjs,cts,mjs,mts,jsx,tsx}',
);

export interface Loader {
  id: string;
  actualLoader: boolean;
}

export type State = {
  ast: swc.Program;
  id: string;
  code: string;
  loaders: Loader[];
  sutairuPath: ResolvedConfig['sutairuPath'];
};

export const extractorAll = {
  name: '@sutairu/plugin/extractor-all',
  order: 0,
  async extract({ code, id, sutairuPath, dependencies }) {
    if (!id || !code || defaultAllFileRE.test(id)) return;

    const tokens: string[] = [];
    const ast = await codeToAST(code, id);

    let loaders = [
      { id: '@sutairu/react', actualLoader: true },
      { id: '@sutairu/core', actualLoader: true },
    ].concat(
      ...(Array.isArray(sutairuPath)
        ? (sutairuPath as string[])
        : [sutairuPath]
      ).map((i) => ({ id: i, actualLoader: true })),
    );

    let {
      variables,
      imports,
    }: {
      variables: Variable[];
      imports: Import[];
    } = {
      variables: [],
      imports: [],
    };

    const resolveLoaders = async () => {
      const cjsResolved = loaders.map((loader) => {
        try {
          return {
            ...loader,
            id: require.resolve(loader.id),
          };
        } catch {
          return false;
        }
      });

      const mjsResolved = cjsResolved.map((loader) => {
        if (!loader) return false;

        const ext = extname(loader.id);

        try {
          if (ext === '.cjs') {
            // attempt to also find a .mjs file
            return {
              ...loader,
              id: require.resolve(loader.id.replace(/\.cjs$/, '.mjs')),
            };
          }
          if (ext === '.cts') {
            // attempt to also find a .mts file
            return {
              ...loader,
              id: require.resolve(loader.id.replace(/\.cts$/, '.mts')),
            };
          }

          return false;
        } catch {
          return false;
        }
      });

      loaders = removeDups(
        [...loaders, ...cjsResolved, ...mjsResolved].filter(
          Boolean,
        ) as State['loaders'],
      );
    };

    const registerSutairuCall = (
      args: swc.Argument[],
      origin: Variable & {
        sutairuInstance: Sutairu | ReactSutairu;
        imported: false | string;
      },
    ) => {
      if (!origin.kind || !(origin.kind in origin.sutairuInstance)) return;

      const { sutairuInstance } = origin;

      let render:
        | ReturnType<typeof sutairuInstance.css>
        | ReturnType<typeof sutairuInstance.keyframes>
        | ReturnType<typeof sutairuInstance.globalCss>
        | ReturnType<typeof sutairuInstance.createTheme>
        | StyledComponent
        | undefined;

      switch (origin.kind) {
        case 'css':
          render = sutairuInstance.css(
            ...origin.args.map((arg: any, index) => {
              const maybeParent = origin.parents.find((p) => p.index === index);
              if (maybeParent) {
                switch (maybeParent.kind) {
                  case 'css':
                    return sutairuInstance.css(arg);
                  case 'styled':
                    return (sutairuInstance as ReactSutairu).styled(arg);
                }
              }

              return arg;
            }),
          );
          break;
        case 'keyframes':
          render = sutairuInstance.keyframes(
            origin.args[0] as Record<string, CSS>,
          );
          break;
        case 'globalCss':
          render = sutairuInstance.globalCss(origin.args[0] as CSS[]);
          break;
        case 'styled':
          render = (sutairuInstance as ReactSutairu).styled(
            ...origin.args.map((arg: any, index) => {
              const maybeParent = origin.parents.find((p) => p.index === index);
              if (maybeParent) {
                switch (maybeParent.kind) {
                  case 'css':
                    return sutairuInstance.css(arg);
                  case 'styled':
                    return (sutairuInstance as ReactSutairu).styled(arg);
                }
              }

              return arg;
            }),
          );
          break;
        case 'createTheme':
          render = sutairuInstance.createTheme(
            origin.args[0] as string,
            origin.args[1] as {},
          );
          break;
        case 'reset':
          sutairuInstance.reset();
          tokens.splice(0, tokens.length);
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
          sutairuError('No support for spreads in functions');
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

      if (origin.imported) dependencies.add(origin.imported);

      if (origin.kind === 'createTheme') {
        String(render);
        return tokens.push(
          (render as ReturnType<typeof sutairuInstance.createTheme>).className,
        );
      }
      if (origin.kind === 'keyframes') {
        String(render);
        return tokens.push(
          (render as ReturnType<typeof sutairuInstance.keyframes>).name,
        );
      }

      const value = (
        origin.kind === 'styled' ? (render as any).render : render
      )(
        ...renderArgs.map((arg, index) => {
          const maybeParent = origin.parents.find((p) => p.index === index);
          if (maybeParent) {
            switch (maybeParent.kind) {
              case 'css':
                return sutairuInstance.css(arg);
              case 'styled':
                return (sutairuInstance as ReactSutairu).styled(arg);
            }
          }

          return arg;
        }),
      );

      tokens.push(
        value.props ? value.props.className : value.className || value,
      );
    };

    const seenExprs = new Set<swc.Expression>();

    const visitExpressionStatement = async (
      exprStmnt: swc.ExpressionStatement | swc.JSXExpressionContainer,
    ) => {
      const { expression } = exprStmnt;

      if (seenExprs.has(expression)) return;
      seenExprs.add(expression);

      // createTheme - obj.theme.className or obj.theme
      if (expression.type === 'MemberExpression') {
        const { object, property } = expression;

        if (property.type !== 'Identifier') return;

        let imported = '';

        if (
          object.type === 'MemberExpression' &&
          property.value === 'className'
        ) {
          const { object: innerObject, property: innerProperty } = object;
          if (innerObject.type !== 'Identifier') return;
          if (innerProperty.type !== 'Identifier') return;

          let maybeOrigin = variables.find(
            (c) =>
              c.name === innerProperty.value &&
              c.ctxt === property.span.ctxt &&
              c.object?.value === innerObject.value,
          );

          if (
            !maybeOrigin &&
            Array.from(imports).some(
              (i) =>
                i.ctxt === expression.span.ctxt &&
                i.value === innerObject.value,
            )
          ) {
            const maybeImport = imports.find(
              (i) =>
                i.ctxt === expression.span.ctxt &&
                i.value === innerObject.value,
            );
            if (!maybeImport) return;

            try {
              const { variables: foreignVariables } =
                await extractVariablesAndImports({
                  ast: await fileToAST(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  code,
                  sutairuPath,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === innerObject.value && c.exported === true,
              );

              if (maybeOrigin) imported = maybeImport.resolved;
            } catch {}
          }

          if (!maybeOrigin) return;

          registerSutairuCall([], {
            ...maybeOrigin,
            sutairuInstance: maybeOrigin.sutairuInstance as
              | Sutairu
              | ReactSutairu,
            imported: imported || false,
          });
        } else if (
          object.type === 'Identifier' &&
          property.value === 'className'
        ) {
          let maybeOrigin = variables.find(
            (c) => c.name === object.value && c.ctxt === property.span.ctxt,
          );

          if (
            !maybeOrigin &&
            Array.from(imports).some(
              (i) =>
                i.ctxt === expression.span.ctxt && i.value === object.value,
            )
          ) {
            const maybeImport = imports.find(
              (i) =>
                i.ctxt === expression.span.ctxt && i.value === object.value,
            );
            if (!maybeImport) return;

            try {
              const { variables: foreignVariables } =
                await extractVariablesAndImports({
                  ast: await fileToAST(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  code,
                  sutairuPath,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === object.value && c.exported === true,
              );

              if (maybeOrigin) imported = maybeImport.resolved;
            } catch {}
          }

          if (!maybeOrigin) return;

          registerSutairuCall([], {
            ...maybeOrigin,
            sutairuInstance: maybeOrigin.sutairuInstance as
              | Sutairu
              | ReactSutairu,
            imported: imported || false,
          });
        }
      } else if (expression.type === 'CallExpression') {
        const { callee } = expression;

        if (
          callee.type !== 'Identifier' &&
          callee.type !== 'CallExpression' &&
          callee.type !== 'MemberExpression'
        )
          return;

        let imported = '';
        let origin: Variable = {
          parents: [],
          args: [],
          kind: '',
          sutairuInstance: undefined,
          ctxt: 0,
          name: '',
        };

        // createTheme - String(obj.theme)
        if (callee.type === 'Identifier' && callee.value === 'String') {
          const firstArg = expression.arguments[0];
          if (!firstArg) return;

          if (firstArg.expression.type === 'MemberExpression') {
            const { object, property } = firstArg.expression;

            if (property.type !== 'Identifier') return;
            if (object.type !== 'Identifier') return;

            let maybeOrigin = variables.find(
              (c) =>
                c.name === property.value &&
                c.ctxt === expression.span.ctxt &&
                c.object?.value === object.value,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) =>
                  i.ctxt === expression.span.ctxt && i.value === object.value,
              )
            ) {
              const maybeImport = imports.find(
                (i) =>
                  i.ctxt === expression.span.ctxt && i.value === object.value,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === property.value && c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }
            if (!maybeOrigin) return;

            origin = maybeOrigin;
          } else if (firstArg.expression.type === 'Identifier') {
            const { expression } = firstArg;

            let maybeOrigin = variables.find(
              (c) =>
                c.name === expression.value && c.ctxt === expression.span.ctxt,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) =>
                  i.ctxt === expression.span.ctxt &&
                  i.value === expression.value,
              )
            ) {
              const maybeImport = imports.find(
                (i) =>
                  i.ctxt === expression.span.ctxt &&
                  i.value === expression.value,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === expression.value && c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }
          }

          return void registerSutairuCall([], {
            ...origin,
            sutairuInstance: origin.sutairuInstance as Sutairu | ReactSutairu,
            imported: imported || false,
          });
        }

        if (callee.type === 'Identifier') {
          let maybeOrigin = variables.find(
            (c) => c.name === callee.value && c.ctxt === exprStmnt.span.ctxt,
          );
          if (
            !maybeOrigin &&
            Array.from(imports).some(
              (i) =>
                i.ctxt === expression.span.ctxt && i.value === callee.value,
            )
          ) {
            const maybeImport = imports.find(
              (i) =>
                i.ctxt === expression.span.ctxt && i.value === callee.value,
            );
            if (!maybeImport) return;

            try {
              const { variables: foreignVariables } =
                await extractVariablesAndImports({
                  ast: await fileToAST(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  code,
                  sutairuPath,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === callee.value && c.exported === true,
              );

              if (maybeOrigin) imported = maybeImport.resolved;
            } catch {}
          }
          if (!maybeOrigin) return;

          origin = maybeOrigin;
        } else if (callee.type === 'CallExpression') {
          const { callee: innerCallee } = callee;

          // createTheme String(theme)
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
                  (i) =>
                    i.ctxt === innerCallee.span.ctxt && i.value === firstArg,
                )
              ) {
                const maybeImport = imports.find(
                  (i) =>
                    i.ctxt === innerCallee.span.ctxt && i.value === firstArg,
                );
                if (!maybeImport) return;

                try {
                  const { variables: foreignVariables } =
                    await extractVariablesAndImports({
                      ast: await fileToAST(maybeImport.resolved),
                      loaders,
                      id: maybeImport.resolved,
                      code,
                      sutairuPath,
                    });

                  maybeOrigin = foreignVariables.find(
                    (c) => c.name === firstArg && c.exported === true,
                  );

                  if (maybeOrigin) imported = maybeImport.resolved;
                } catch {}
              }

              if (!maybeOrigin) return;

              origin = maybeOrigin;
            }
          }
          // inline calling
          else if (callee.type === 'CallExpression') {
            if (innerCallee.type !== 'Identifier') return;

            const importSource = imports.find(
              (i) =>
                i.ctxt === exprStmnt.span.ctxt && i.value === innerCallee.value,
            );
            if (!importSource) return;
            // we don't want unrelated call expressions
            if (!STYLE_FUNCTIONS.includes(innerCallee.value)) return;

            origin = {
              kind: innerCallee.value,
              args: callee.arguments.flatMap((exprOrSpread, index) => {
                if (exprOrSpread.spread) {
                  sutairuError('No support for spreads in functions');
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
                    return;
                  }
                } else if (
                  exprOrSpread.expression.type === 'ObjectExpression' &&
                  typeof origin.sutairuInstance === 'object' &&
                  origin.sutairuInstance != null &&
                  ('css' in origin.sutairuInstance ||
                    'keyframes' in origin.sutairuInstance)
                ) {
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
                              v.name === expr.value &&
                              v.ctxt === node.span.ctxt,
                          );
                          if (!maybeMatch) continue;
                          const { args, kind } = maybeMatch;
                          if (
                            kind === 'keyframes' &&
                            origin.sutairuInstance != null &&
                            'keyframes' in origin.sutairuInstance
                          ) {
                            const replacement = origin.sutairuInstance
                              .keyframes(args[0] as Record<string, CSS>)
                              .toString();
                            const { start, end } = expr.span;
                            tokens.push(replacement);
                            replaced.push({ start, end, value: replacement });
                          } else if (
                            kind === 'css' &&
                            origin.sutairuInstance != null &&
                            'css' in origin.sutairuInstance
                          ) {
                            const replacement = origin.sutairuInstance
                              .css(...(args as CSS[]))
                              .toString();
                            const { start, end } = expr.span;
                            tokens.push(replacement);
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
                              v.name === expr.value &&
                              v.ctxt === expression.span.ctxt,
                          );
                          if (!maybeMatch) continue;
                          const { args, kind } = maybeMatch;
                          if (
                            kind === 'keyframes' &&
                            origin.sutairuInstance != null &&
                            'keyframes' in origin.sutairuInstance
                          ) {
                            const replacement = origin.sutairuInstance
                              .keyframes(args[0] as Record<string, CSS>)
                              .toString();
                            const { start, end } = expr.span;
                            tokens.push(replacement);
                            replaced.push({ start, end, value: replacement });
                          } else if (
                            kind === 'css' &&
                            origin.sutairuInstance != null &&
                            'css' in origin.sutairuInstance
                          ) {
                            const replacement = origin.sutairuInstance
                              .css(...(args as CSS[]))
                              .toString();
                            const { start, end } = expr.span;
                            tokens.push(replacement);
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
              }),
              ctxt: exprStmnt.span.ctxt,
              sutairuInstance: lazyJiti(id)(importSource.resolved),
              name: '',
              parents: [],
            };
          }
        } else if (callee.type === 'MemberExpression') {
          const { property, object } = callee;

          if (property.type !== 'Identifier') return;
          if (
            object.type !== 'Identifier' &&
            object.type !== 'MemberExpression'
          )
            return;

          // createTheme - obj.theme.toString()
          if (
            object.type === 'MemberExpression' &&
            property.value === 'toString'
          ) {
            const { object: innerObject, property: innerProperty } = object;

            if (innerProperty.type !== 'Identifier') return;
            if (innerObject.type !== 'Identifier') return;

            let maybeOrigin = variables.find(
              (c) =>
                c.name === innerProperty.value &&
                c.ctxt === innerProperty.span.ctxt &&
                c.object?.value === innerObject.value,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) =>
                  i.ctxt === callee.span.ctxt && i.value === innerObject.value,
              )
            ) {
              const maybeImport = imports.find(
                (i) =>
                  i.ctxt === callee.span.ctxt && i.value === innerObject.value,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === innerObject.value && c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }

            if (!maybeOrigin) return;

            origin = maybeOrigin;
          } else if (object.type === 'Identifier') {
            let maybeOrigin = variables.find(
              (c) =>
                c.name === property.value &&
                c.ctxt === property.span.ctxt &&
                c.object?.value === object.value,
            );

            // createTheme - obj.theme.toString()
            if (!maybeOrigin && property.value === 'toString') {
              maybeOrigin = variables.find(
                (c) =>
                  c.name === object.value && c.ctxt === exprStmnt.span.ctxt,
              );
            }

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
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) =>
                    (c.name === property.value ||
                      (property.value === 'toString' &&
                        c.name === object.value)) &&
                    c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }

            if (!maybeOrigin) return;

            origin = maybeOrigin;
          }
        }

        if (typeof origin.sutairuInstance === 'object')
          registerSutairuCall(expression.arguments, {
            ...origin,
            sutairuInstance: origin.sutairuInstance as Sutairu | ReactSutairu,
            imported: imported || false,
          });
      }
    };

    const _visit = async () =>
      visit(ast, {
        visitExpressionStatement,
        visitJSXExpressionContainer: visitExpressionStatement,
        visitCallExpression: async (callExpr, parent) => {
          const { callee } = callExpr;

          // createTheme - String(obj.theme)
          if (callee.type === 'Identifier' && callee.value === 'String') {
            const firstArg = callExpr.arguments[0];
            if (!firstArg) return;

            const { expression } = firstArg;
            if (expression.type !== 'Identifier') return;

            let maybeOrigin = variables.find(
              (c) =>
                c.name === expression.value && c.ctxt === callExpr.span.ctxt,
            );
            let imported = '';

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
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === expression.value && c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }
            if (!maybeOrigin) return;

            registerSutairuCall([], {
              ...maybeOrigin,
              sutairuInstance: maybeOrigin.sutairuInstance as
                | Sutairu
                | ReactSutairu,
              imported: imported || false,
            });
          }
          // for when functions are called as arguments or inside of other
          // functions (ex. fn(colorRed()))
          else if (
            parent &&
            !Array.isArray(parent) &&
            parent.type !== 'ExpressionStatement' &&
            parent.type !== 'JSXExpressionContainer'
          ) {
            await visitExpressionStatement({
              expression: callExpr,
              type: 'ExpressionStatement',
              span: callExpr.span,
            });
          }
        },
        // styled
        visitJSXElement: async (jsxEl) => {
          const { opening } = jsxEl;
          const openingName = opening.name;

          let origin: Variable | undefined;
          let cssArg: swc.JSXAttributeOrSpread | undefined;
          let imported = '';

          if (openingName.type === 'Identifier') {
            let maybeOrigin = variables.find(
              (c) => c.name === openingName.value && c.ctxt === jsxEl.span.ctxt,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) =>
                  i.ctxt === openingName.span.ctxt &&
                  i.value === openingName.value,
              )
            ) {
              const maybeImport = imports.find(
                (i) =>
                  i.ctxt === openingName.span.ctxt &&
                  i.value === openingName.value,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === openingName.value && c.exported === true,
                );
              } catch {}
            }
            if (!maybeOrigin) return;

            cssArg = opening.attributes.find(
              (attr) =>
                attr.type === 'JSXAttribute' &&
                attr.name.type === 'Identifier' &&
                attr.name.value === 'css',
            );

            origin = maybeOrigin;
          } else if (openingName.type === 'JSXMemberExpression') {
            const { object, property } = openingName;

            if (object.type !== 'Identifier') return;
            if (property.type !== 'Identifier') return;

            let maybeOrigin = variables.find(
              (c) =>
                c.name === property.value &&
                c.ctxt === jsxEl.span.ctxt &&
                c.object?.value === object.value,
            );

            if (
              !maybeOrigin &&
              Array.from(imports).some(
                (i) => i.ctxt === jsxEl.span.ctxt && i.value === object.value,
              )
            ) {
              const maybeImport = imports.find(
                (i) => i.ctxt === jsxEl.span.ctxt && i.value === object.value,
              );
              if (!maybeImport) return;

              try {
                const { variables: foreignVariables } =
                  await extractVariablesAndImports({
                    ast: await fileToAST(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    code,
                    sutairuPath,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === property.value && c.exported === true,
                );

                if (maybeOrigin) imported = maybeImport.resolved;
              } catch {}
            }
            if (!maybeOrigin) return;

            cssArg = opening.attributes.find(
              (attr) =>
                attr.type === 'JSXAttribute' &&
                attr.name.type === 'Identifier' &&
                attr.name.value === 'css',
            );

            origin = maybeOrigin;
          }

          if (!origin) return;

          registerSutairuCall(
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
              ...origin,
              sutairuInstance: origin.sutairuInstance as Sutairu | ReactSutairu,
              imported: imported || false,
            },
          );
        },
        // createTheme - theme.className
        visitMemberExpression: async (memberExpr) => {
          const { object, property } = memberExpr;
          if (object.type !== 'Identifier') return;
          if (property.type !== 'Identifier') return;
          if (property.value !== 'className') return;

          let maybeOrigin = variables.find(
            (c) => c.name === object.value && c.ctxt === memberExpr.span.ctxt,
          );
          let imported = '';

          if (
            !maybeOrigin &&
            Array.from(imports).some(
              (i) =>
                i.ctxt === memberExpr.span.ctxt && i.value === object.value,
            )
          ) {
            const maybeImport = imports.find(
              (i) =>
                i.ctxt === memberExpr.span.ctxt && i.value === object.value,
            );
            if (!maybeImport) return;

            try {
              const { variables: foreignVariables } =
                await extractVariablesAndImports({
                  ast: await fileToAST(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  code,
                  sutairuPath,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === object.value && c.exported === true,
              );

              if (maybeOrigin) imported = maybeImport.resolved;
            } catch {}
          }
          if (!maybeOrigin) return;

          registerSutairuCall([], {
            ...maybeOrigin,
            sutairuInstance: maybeOrigin.sutairuInstance as
              | Sutairu
              | ReactSutairu,
            imported: imported || false,
          });
        },
      });

    await Promise.all([
      new Promise((resolve) => {
        resolveLoaders().then(resolve);
      }),
      new Promise((resolve) => {
        extractVariablesAndImports({
          ast,
          loaders,
          id,
          code,
          sutairuPath,
        }).then((extracted) => {
          variables = extracted.variables;
          imports = extracted.imports;
          tokens.push(...extracted.tokens);
          _visit().then(resolve);
        });
      }),
    ]);

    return {
      tokens: removeDups(tokens),
      loaders: loaders.map((l) => l.id),
      dependencies,
    };
  },
} satisfies Extractor;
