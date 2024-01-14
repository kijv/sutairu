import * as SWC from '@swc/wasm';
import { State } from '.';
import { CSS } from '../../../core';
import { stitchesError } from '../../../stitches-error';
import { DUMMY_SP, expressionToJSON } from '../../ast/util';
import { visitSync } from '../../ast/visit';
import { extractImports } from './imports';

// biome-ignore lint/suspicious/noExplicitAny: Generic type depends on any for inference
type ArrayItem<T extends any[]> = T extends (infer U)[] ? U : never;
type NotNull<T> = T extends null | undefined ? never : T;

/** These functions insert styles into the sheet */
export const STYLE_FUNCTIONS = [
  'css',
  'globalCss',
  'keyframes',
  'createTheme',
  'styled',
];
export const EXTENDABLE_STYLE_FUNCTIONS = ['css', 'styled'];

/**
 * Extracts variables from a given AST,
 * we don't do anything with them except
 * adding them into a list for the current file
 *
 * Returns an array of variables, each with:
 * - The kind of @jujst/stitches function being used (ex. `css`, `keyframes`, `global` etc.)
 * - The name of the variable being assigned to (and the ctxt/scopes it's in)
 */
export const extractVariablesAndImports = ({
  stitches,
  ast,
  loaders,
  id,
  configFileList,
  code,
}: State) => {
  const imports = extractImports({
    ast,
    loaders,
    id,
    configFileList,
    stitches,
    code,
  });
  const inlineLoaders: {
    value: string;
    ctxt: number;
  }[] = [];
  const variables: {
    parents: {
      kind: string;
      index: number;
      args: unknown[];
    }[];
    ctxt: number;
    kind: ArrayItem<typeof STYLE_FUNCTIONS>;
    args: unknown[];
    name: string;
    exported?: boolean;
  }[] = [];

  const getCallExpr = (varDecl: SWC.VariableDeclaration) => {
    const decl = varDecl.declarations
      .map((decl) => decl.init)
      .find(
        (init) =>
          init?.type === 'CallExpression' &&
          (init.callee.type === 'Identifier' ||
            (init.callee.type === 'MemberExpression' &&
              init.callee.object.type === 'Identifier' &&
              init.callee.property.type === 'Identifier')),
      );

    if (decl?.type !== 'CallExpression') return;
    if (
      decl.callee.type !== 'Identifier' &&
      decl.callee.type !== 'MemberExpression'
    )
      return;
    if (
      decl.callee.type === 'MemberExpression' &&
      decl.callee.object.type !== 'Identifier' &&
      decl.callee.property.type !== 'Identifier'
    )
      return;

    return decl as
      | (SWC.CallExpression & {
          callee:
            | SWC.Identifier
            | (SWC.MemberExpression & {
                object: SWC.Identifier;
                property: SWC.Identifier;
              });
        })
      | undefined;
  };

  const registerVariable = (
    calleValue: string,
    callExpr: NotNull<ReturnType<typeof getCallExpr>>,
    varIdent: SWC.Identifier,
    exported = false,
  ) => {
    // if we see `defineConfig` and their values being used in the
    // same file, use that to ensure variables are of correct origin
    if (calleValue === 'defineConfig' && loaders.includes(id)) {
      inlineLoaders.push({
        value: varIdent.value,
        ctxt: callExpr.callee.span.ctxt,
      });
    } else if (STYLE_FUNCTIONS.includes(calleValue)) {
      const parents: ArrayItem<typeof variables>['parents'] = [];
      variables.push({
        parents: [],
        ctxt: callExpr.callee.span.ctxt,
        kind: calleValue,
        name: varIdent.value,
        args: callExpr.arguments.flatMap((exprOrSpread, index) => {
          if (exprOrSpread.spread) {
            stitchesError('No support for spreads in functions');
          }

          const { expression } = exprOrSpread;

          if (
            expression.type === 'Identifier' &&
            EXTENDABLE_STYLE_FUNCTIONS.includes(calleValue)
          ) {
            const maybeParent = variables.find(
              (i) =>
                i.name === expression.value && i.ctxt === expression.span.ctxt,
            );
            if (maybeParent) {
              parents.push({
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
                      (v) => v.name === expr.value && v.ctxt === expr.span.ctxt,
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
                      (v) => v.name === expr.value && v.ctxt === expr.span.ctxt,
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
        }),
        exported,
      });
    }
  };

  function visitVariableDeclaration(
    varDecl: SWC.VariableDeclaration,
    parent: unknown,
  ) {
    const varIdent = varDecl.declarations
      .map((decl) => decl.id)
      .map((id) =>
        id instanceof Map
          ? (Object.fromEntries(id.entries()) as SWC.Pattern)
          : id,
      )
      .find((id) => id.type === 'Identifier');

    if (varIdent?.type !== 'Identifier') return;

    const callExpr = getCallExpr(varDecl);
    if (!callExpr) return;

    const calleValue =
      callExpr.callee.type === 'Identifier'
        ? callExpr.callee.value
        : callExpr.callee.property.value;

    if (
      Array.from(imports).some(
        (i) => i.value === calleValue && i.ctxt === varDecl.span.ctxt,
      ) ||
      inlineLoaders.some(
        (l) =>
          callExpr.callee.type === 'MemberExpression' &&
          callExpr.callee.object.span.ctxt === l.ctxt &&
          callExpr.callee.object.value === l.value,
      )
    ) {
      if (varDecl.kind !== 'const') {
        return stitchesError(
          "Can't assign to `let` or `var` when using functions with PostCSS",
        );
      }

      registerVariable(
        calleValue,
        callExpr,
        varIdent,
        typeof parent === 'object' &&
          !!parent &&
          'type' in parent &&
          typeof parent.type === 'string' &&
          parent.type.startsWith('Export'),
      );
    }
  }

  visitSync(ast, {
    visitVariableDeclaration,
    visitKeyValueProperty(keyValProp) {
      try {
        const callExpr = keyValProp.value;

        if (
          callExpr.type !== 'CallExpression' ||
          callExpr.callee.type !== 'Identifier'
        )
          return;

        const calleeValue = callExpr.callee.value;
        const calleeCtxt = callExpr.callee.span.ctxt;
        const key = keyValProp.key;

        if (key.type === 'Computed') return;
        const keyAsJSON =
          key.type === 'Identifier' ? key.value : expressionToJSON(key);

        if (
          Array.from(imports).some(
            (i) => i.value === calleeValue && i.ctxt === calleeCtxt,
          )
        ) {
          if (keyValProp.value.type !== 'CallExpression') return;

          registerVariable(
            calleeValue,
            callExpr as SWC.CallExpression & {
              callee: SWC.Identifier;
            },
            {
              type: 'Identifier',
              value: keyAsJSON,
              span: keyValProp.key.span,
              optional: false,
            },
          );
        }
      } catch (e) {
        // We can let silent failure happen here
        // because this checks all kinds of objects,
        // and we don't know if this belongs to us,
        // so we just ignore it.
      }
    },
  });

  return { variables, imports };
};
