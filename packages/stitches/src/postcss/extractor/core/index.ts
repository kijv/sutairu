import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { parse, parseSync } from '@swc/wasm';
import type * as SWC from '@swc/wasm';
import type { CSS } from '../../../core';
import type Stitches from '../../../core/types/stitches';
import type ReactStitches from '../../../react/types/stitches';
import type { StyledComponent } from '../../../react/types/styled-component';
import { DUMMY_SP, expressionToJSON } from '../../ast/util';
import { visitSync } from '../../ast/visit';
import { JS_TYPES_RE } from '../../constants';
import { stitchesError } from '../../stitches-error';
import type { Extractor } from '../../types';
import { jsonArguments } from './utils';
import {
  EXTENDABLE_STYLE_FUNCTIONS,
  type Variable,
  extractVariablesAndImports,
} from './vars';

function removeDups<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export type State = {
  stitches: Stitches;
  ast: SWC.Program;
  id: string;
  code: string;
  configFileList: string[];
  loaders: {
    id: string;
    actualLoader: boolean;
  }[];
};

export const extractorCore: Extractor = {
  name: '@jujst/stitches/extractor-core',
  order: 0,
  async extract({ code, id, stitches, configFileList }) {
    if (!id || (!code && !JS_TYPES_RE.test(id))) return;

    const tokens: string[] = [];
    const ast = await codeToAST(code, id);

    let loaders = [
      { id: '@jujst/stitches/react', actualLoader: true },
      { id: '@jujst/stitches/core', actualLoader: true },
      ...configFileList.map((file) => ({ id: file, actualLoader: false })),
    ];

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

    const {
      tokens: addTheseTokens,
      variables,
      imports,
    } = extractVariablesAndImports({
      ast,
      loaders,
      id,
      configFileList,
      stitches,
      code,
    });

    tokens.push(...addTheseTokens);

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
                    return stitches.styled(arg);
                }
              }

              return arg;
            }),
          );
          break;
        case 'keyframes':
          render = stitches.keyframes(origin.args[0] as Record<string, CSS>);
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
        case 'reset':
          stitches.reset();
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
      if (origin.kind === 'keyframes') {
        String(render);
        return tokens.push(render.name);
      }

      const value = (origin.kind === 'styled' ? render.render : render)(
        ...renderArgs.map((arg, index) => {
          const maybeParent = origin.parents.find((p) => p.index === index);
          if (maybeParent) {
            switch (maybeParent.kind) {
              case 'css':
                return stitches.css(arg);
              case 'styled':
                return stitches.styled(arg);
            }
          }

          return arg;
        }),
      );

      tokens.push(
        value.props ? value.props.className : value.className || value,
      );
    };

    const visitExpressionStatement = (
      exprStmnt: SWC.ExpressionStatement | SWC.JSXExpressionContainer,
    ) => {
      const { expression } = exprStmnt;

      // createTheme - obj.theme.className or obj.theme
      if (expression.type === 'MemberExpression') {
        const { object, property } = expression;

        if (property.type !== 'Identifier') return;

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
                extractVariablesAndImports({
                  ast: fileToASTSync(maybeImport.resolved),
                  loaders,
                  id: maybeImport.resolved,
                  configFileList,
                  stitches,
                  code,
                });

              maybeOrigin = foreignVariables.find(
                (c) => c.name === innerObject.value && c.exported === true,
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
        }
      } else if (expression.type === 'CallExpression') {
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
                  extractVariablesAndImports({
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
            if (!maybeOrigin) return;

            const { kind, args, parents } = maybeOrigin;
            origin.kind = kind;
            origin.args = args;
            origin.parents = parents;
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
          }

          return void registerStitchesCall([], origin);
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
                extractVariablesAndImports({
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
                            .keyframes(args[0] as Record<string, CSS>)
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
                            .keyframes(args[0] as Record<string, CSS>)
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
                  extractVariablesAndImports({
                    ast: fileToASTSync(maybeImport.resolved),
                    loaders,
                    id: maybeImport.resolved,
                    configFileList,
                    stitches,
                    code,
                  });

                maybeOrigin = foreignVariables.find(
                  (c) => c.name === innerObject.value && c.exported === true,
                );
              } catch {}
            }

            if (!maybeOrigin) return;

            const { kind, args, parents } = maybeOrigin;
            origin.kind = kind;
            origin.args = args;
            origin.parents = parents;
          } else if (object.type === 'Identifier') {
            let maybeOrigin = variables.find(
              (c) =>
                c.name === property.value &&
                c.ctxt === property.span.ctxt &&
                c.object?.value === object.value,
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
                  (c) => c.name === property.value && c.exported === true,
                );
              } catch {}
            }
            // createTheme - obj.theme.toString()
            if (!maybeOrigin && property.value === 'toString') {
              maybeOrigin = variables.find(
                (c) =>
                  c.name === object.value && c.ctxt === exprStmnt.span.ctxt,
              );

              if (
                !maybeOrigin &&
                Array.from(imports).some(
                  (i) =>
                    i.ctxt === callee.span.ctxt && i.value === object.value,
                )
              ) {
                const maybeImport = imports.find(
                  (i) =>
                    i.ctxt === callee.span.ctxt && i.value === object.value,
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
        }

        registerStitchesCall(expression.arguments, origin);
      }
    };

    await visitSync(ast, {
      visitExpressionStatement,
      visitJSXExpressionContainer: visitExpressionStatement,
      visitCallExpression: (callExpr) => {
        const { callee } = callExpr;

        // createTheme - String(obj.theme)
        if (callee.type === 'Identifier' && callee.value === 'String') {
          const firstArg = callExpr.arguments[0];
          if (!firstArg) return;

          const { expression } = firstArg;
          if (expression.type !== 'Identifier') return;

          let maybeOrigin = variables.find(
            (c) => c.name === expression.value && c.ctxt === callExpr.span.ctxt,
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

        let origin: Variable | undefined;
        let cssArg: SWC.JSXAttributeOrSpread | undefined;

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
                extractVariablesAndImports({
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
                extractVariablesAndImports({
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
            kind: origin.kind,
            args: origin.args,
            parents: origin.parents,
          },
        );
      },
      // createTheme - theme.className
      visitMemberExpression: (memberExpr) => {
        const { object, property } = memberExpr;
        if (object.type !== 'Identifier') return;
        if (property.type !== 'Identifier') return;
        if (property.value !== 'className') return;

        let maybeOrigin = variables.find(
          (c) => c.name === object.value && c.ctxt === memberExpr.span.ctxt,
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

    return removeDups(tokens);
  },
};

const codeToAST = async (code: string, filepath: string) => {
  const ext = extname(filepath);
  const tsx = ext.endsWith('tsx');
  const ts = ext.endsWith('ts');
  const jsx = ext.endsWith('jsx');

  return parse(code, {
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
