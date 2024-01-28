import type * as swc from '@swc/wasm';
import picomatch from 'picomatch';
import type { CSS } from '../../../../core/src/index';
import { DUMMY_SP, expressionToJSON } from '../../ast/util';
import { visit, visitSync } from '../../ast/visit';
import { lazyJiti } from '../../utils/jiti';
import { sutairuError } from '../../utils/stitches-error';
import type { State } from '../all';
import { type Import, extractImports } from './imports';

type NotNull<T> = T extends null | undefined ? never : T;

/** These functions insert styles into the sheet */
export const STYLE_FUNCTIONS = [
  'css',
  'globalCss',
  'keyframes',
  'createTheme',
  'styled',
  // ! experimental
  'reset',
  'getCssText',
];
export const EXTENDABLE_STYLE_FUNCTIONS = ['css', 'styled'];

export interface Variable {
  parents: {
    kind: string;
    index: number;
    args: unknown[];
  }[];
  ctxt: number;
  kind: string;
  args: unknown[];
  name: string;
  exported?: boolean;
  object?: swc.Identifier;
  sutairuInstance: undefined | Record<string, any>;
}

interface InlineLoader {
  value: string;
  from: string;
  ctxt: number;
}

const stitchesInstances = new Map<
  string,
  {
    mod: unknown;
    mtimeMs: number;
  }
>();

export const getStitchesInstance = async (id: string) => {
  const instance = await lazyJiti()(id);
  stitchesInstances.set(id, instance);
  return instance;
};

/**
 * Extracts variables from a given AST,
 * we don't do anything with them except
 * adding them into a list for the current file
 *
 * Returns an array of variables, each with:
 * - The kind of sutairu function being used (ex. `css`, `keyframes`, `global` etc.)
 * - The name of the variable being assigned to (and the ctxt/scopes it's in)
 */
export const extractVariablesAndImports = async ({
  ast,
  loaders,
  id,
  code,
  sutairuPath,
}: State) => {
  let imports: Array<Import> = [];
  const inlineLoaders = [] as unknown as InlineLoader[] & {
    _push: InlineLoader[]['push'];
  };

  inlineLoaders._push = inlineLoaders.push;
  inlineLoaders.push = loaders.some((l) => picomatch.isMatch(id, l.id))
    ? inlineLoaders._push
    : () => -1;

  const variables: Variable[] = [];
  const tokens = new Set<string>();

  const getCallExpr = (varDecl: swc.VariableDeclaration) => {
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
      | (swc.CallExpression & {
          callee:
            | swc.Identifier
            | (swc.MemberExpression & {
                object: swc.Identifier;
                property: swc.Identifier;
              });
        })
      | undefined;
  };

  const registerVariable = async (
    calleValue: string,
    callExpr: NotNull<ReturnType<typeof getCallExpr>>,
    varIdent: swc.Identifier,
    importer?: Import,
    object?: swc.Identifier,
    exported = false,
  ) => {
    // if we see `createSutairu` and their values being used in the
    // same file, use that to ensure variables are of correct origin
    if (calleValue === 'createSutairu' && varIdent.type === 'Identifier') {
      inlineLoaders.push({
        value: varIdent.value,
        ctxt: callExpr.span.ctxt,
        from: 'createSutairu',
      });
    } else if (STYLE_FUNCTIONS.includes(calleValue) && importer) {
      const isInline = inlineLoaders.some(
        (l) => l.value === calleValue && l.from === 'createSutairu',
      );
      const sutairuInstance = await getStitchesInstance(
        isInline ? id : importer.resolved,
      );
      const parents: Variable['parents'] = [];

      variables.push({
        parents,
        ctxt: callExpr.span.ctxt,
        kind: calleValue,
        name: varIdent.value,
        args: callExpr.arguments.flatMap((exprOrSpread, index) => {
          if (exprOrSpread.spread) {
            sutairuError('No support for spreads in functions');
          }

          const { expression } = exprOrSpread;

          if (
            expression.type === 'Identifier' &&
            EXTENDABLE_STYLE_FUNCTIONS.includes(calleValue)
          ) {
            const maybeParent = variables.find(
              (i) =>
                i.name === expression.value && i.ctxt === callExpr.span.ctxt,
            );
            if (maybeParent) {
              return parents.push({
                kind: maybeParent.kind,
                index,
                args: maybeParent.args,
              });
            }
          } else if (
            exprOrSpread.expression.type === 'ObjectExpression' &&
            typeof sutairuInstance === 'object' &&
            ('css' in sutairuInstance || 'keyframes' in sutairuInstance)
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
                      (v) => v.name === expr.value && v.ctxt === node.span.ctxt,
                    );
                    if (!maybeMatch) continue;
                    const { args, kind } = maybeMatch;
                    if (
                      kind === 'keyframes' &&
                      'keyframes' in sutairuInstance
                    ) {
                      const replacement = sutairuInstance
                        .keyframes(args[0] as Record<string, CSS>)
                        .toString();
                      const { start, end } = expr.span;
                      tokens.add(replacement);
                      replaced.push({ start, end, value: replacement });
                    } else if (kind === 'css' && 'css' in sutairuInstance) {
                      const replacement = sutairuInstance
                        .css(...(args as CSS[]))
                        .toString();
                      const { start, end } = expr.span;
                      tokens.add(replacement);
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
                      'keyframes' in sutairuInstance
                    ) {
                      const replacement = sutairuInstance
                        .keyframes(args[0] as Record<string, CSS>)
                        .toString();
                      const { start, end } = expr.span;
                      tokens.add(replacement);
                      replaced.push({ start, end, value: replacement });
                    } else if (kind === 'css' && 'css' in sutairuInstance) {
                      const replacement = sutairuInstance
                        .css(...(args as CSS[]))
                        .toString();
                      const { start, end } = expr.span;
                      tokens.add(replacement);
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
        object,
        sutairuInstance,
      });
    }
  };

  async function visitVariableDeclaration(
    varDecl: swc.VariableDeclaration,
    parent: unknown,
  ) {
    const varIdents = varDecl.declarations
      .map((decl) => decl.id)
      .map((id) =>
        id instanceof Map
          ? (Object.fromEntries(id.entries()) as swc.Pattern)
          : id,
      );
    const initIsObjectExpr = varDecl.declarations
      .map((decl) => decl.init)
      .some((init) => init?.type === 'ObjectExpression');
    const idIsObjectPattern = varIdents.some(
      (id) => id.type === 'ObjectPattern',
    );

    if (idIsObjectPattern) {
      // Support object destructuring of return value of defineConfig
      // const { theme, utils } = createSutairu({ ... })
      const varIdent = varIdents.find((id) => id.type === 'ObjectPattern');
      if (varIdent?.type !== 'ObjectPattern') return;

      const varInit = varDecl.declarations
        .map((decl) => decl.init)
        .find(
          (init) =>
            init?.type === 'Identifier' ||
            (init?.type === 'CallExpression' &&
              init.callee.type === 'Identifier'),
        );
      if (
        !varInit ||
        (varInit.type !== 'Identifier' && varInit.type !== 'CallExpression') ||
        (varInit.type === 'CallExpression' &&
          varInit.callee.type !== 'Identifier')
      )
        return;

      const varInitValue =
        varInit.type === 'Identifier'
          ? varInit.value
          : (varInit.callee as swc.Identifier).value;

      if (
        !inlineLoaders.some((l) => l.value === varInitValue) &&
        !Array.from(imports).some(
          (i) => i.value === varInitValue && varInit.span.ctxt === i.ctxt,
        )
      )
        return;
      if (varIdent.properties.length === 0) return;

      for (const prop of varIdent.properties) {
        // check if it has a value, which means that is the actual name
        // of the variable being destructured
        if (prop.type === 'KeyValuePatternProperty') {
          const { key, value } = prop;
          if (key.type !== 'Identifier' || value.type !== 'Identifier')
            continue;

          const actualName = key.value;
          const name = value.value;

          if (!STYLE_FUNCTIONS.includes(actualName)) continue;

          const origin = inlineLoaders.find(
            (l) => l.value === varInitValue && l.ctxt === varDecl.span.ctxt,
          );

          if (!origin) continue;

          inlineLoaders.push({
            value: name,
            ctxt: varDecl.span.ctxt,
            // Follow the inline loader of the actual name
            from: origin.from,
          });
        } else if (prop.type === 'AssignmentPatternProperty') {
          const { key, value } = prop;

          if (value) continue;
          if (key.type !== 'Identifier') continue;

          const name = key.value;
          if (!STYLE_FUNCTIONS.includes(name)) continue;

          const origin = inlineLoaders.find(
            (l) => l.value === varInitValue && l.ctxt === varDecl.span.ctxt,
          );

          if (!origin) continue;

          inlineLoaders.push({
            value: name,
            ctxt: varDecl.span.ctxt,
            // Follow the inline loader of the actual name
            from: origin.from,
          });
        } else if (
          prop.type === 'RestElement' &&
          prop.argument.type === 'Identifier'
        ) {
          const origin = inlineLoaders.find(
            (l) => l.value === varInitValue && l.ctxt === varDecl.span.ctxt,
          );

          if (!origin) continue;

          inlineLoaders.push({
            value: prop.argument.value,
            ctxt: varDecl.span.ctxt,
            // Follow the inline loader of the actual name
            from: origin.from,
          });
        }
      }

      return;
    }
    const varIdent = varIdents.find((id) => id.type === 'Identifier');

    if (varIdent?.type !== 'Identifier') return;

    if (!initIsObjectExpr) {
      const callExpr = getCallExpr(varDecl);
      if (!callExpr) return;

      const calleeValue =
        callExpr.callee.type === 'Identifier'
          ? callExpr.callee.value
          : callExpr.callee.property.value;

      const inlineLoader = inlineLoaders.find(
        (l) =>
          (callExpr.callee.type === 'MemberExpression' &&
            callExpr.callee.object.span.ctxt === l.ctxt &&
            callExpr.callee.object.value === l.value) ||
          (l.value === calleeValue && l.ctxt === callExpr.span.ctxt),
      );

      if (
        Array.from(imports).some(
          (i) => i.value === calleeValue && i.ctxt === varDecl.span.ctxt,
        ) ||
        inlineLoader
      ) {
        if (varDecl.kind !== 'const') {
          return sutairuError(
            "Can't assign to `let` or `var` when using functions",
          );
        }

        const importer = Array.from(imports).find(
          (i) =>
            i.value === (inlineLoader?.from || calleeValue) &&
            i.ctxt === varDecl.span.ctxt,
        );

        const exported =
          typeof parent === 'object' &&
          !!parent &&
          'type' in parent &&
          typeof parent.type === 'string' &&
          parent.type.startsWith('Export');

        await registerVariable(
          calleeValue,
          callExpr,
          varIdent,
          importer,
          undefined,
          exported,
        );
      }
    } else if (initIsObjectExpr) {
      const objExpr = varDecl.declarations
        .map((decl) => decl.init)
        .find((init) => init?.type === 'ObjectExpression');
      if (objExpr?.type !== 'ObjectExpression') return;

      for (const prop of objExpr.properties) {
        if (prop.type !== 'KeyValueProperty') continue;

        const keyValProp = prop as swc.KeyValueProperty;

        try {
          const callExpr = keyValProp.value;

          if (
            callExpr.type !== 'CallExpression' ||
            callExpr.callee.type !== 'Identifier'
          )
            return;

          const calleeValue = callExpr.callee.value;
          const key = keyValProp.key;

          if (key.type === 'Computed') return;
          const keyAsJSON =
            key.type === 'Identifier' ? key.value : expressionToJSON(key);

          const inlineLoader = inlineLoaders.find(
            (l) => l.value === calleeValue && l.ctxt === callExpr.span.ctxt,
          );

          if (
            Array.from(imports).some(
              (i) => i.value === calleeValue && i.ctxt === callExpr.span.ctxt,
            ) ||
            inlineLoader
          ) {
            if (keyValProp.value.type !== 'CallExpression') return;

            const importer = Array.from(imports).find(
              (i) =>
                i.value === (inlineLoader?.from || calleeValue) &&
                i.ctxt === varDecl.span.ctxt,
            );

            const exported =
              typeof parent === 'object' &&
              !!parent &&
              'type' in parent &&
              typeof parent.type === 'string' &&
              parent.type.startsWith('Export');

            await registerVariable(
              calleeValue,
              callExpr as swc.CallExpression & {
                callee: swc.Identifier;
              },
              {
                type: 'Identifier',
                span: DUMMY_SP,
                value: keyAsJSON,
                optional: false,
              },
              importer,
              varIdent,
              exported,
            );
          }
        } catch (e) {
          // We can let silent failure happen here
          // because this checks all kinds of objects,
          // and we don't know if this belongs to us,
          // so we just ignore it.
        }
      }
    }
  }

  await Promise.all([
    new Promise((resolve) =>
      extractImports({
        ast,
        loaders,
        id,
        code,
        sutairuPath,
      }).then((newImports) => {
        imports = newImports;

        visit(ast, {
          visitVariableDeclaration,
        }).then(resolve);
      }),
    ),
  ]);

  return {
    tokens,
    variables,
    imports,
  };
};
