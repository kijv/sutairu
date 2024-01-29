import type { Expression, ObjectExpression } from '@swc/wasm';
import { sutairuError } from '../utils/sutairu-error';

export const DUMMY_SP = { start: 0, end: 0, ctxt: 0 };

export function objectLiteralToJSON(object_lit: ObjectExpression) {
  const values = new Map<string | number | bigint, any>();

  for (const prop of object_lit.properties) {
    switch (prop.type) {
      case 'KeyValueProperty': {
        let key: string | number | bigint | undefined;

        if (prop.key.type !== 'Computed') {
          key = prop.key.value;
        } else {
          sutairuError('Unexpected object key type.');
        }

        const val = expressionToJSON(prop.value);

        if (key !== undefined && val !== undefined) {
          values.set(key, val);
        }

        break;
      }
      case 'SpreadElement':
        sutairuError('Sutairu functions cannot contain spreads');
        break;
    }
  }

  return Object.fromEntries(values.entries());
}

export function expressionToJSON(expr: Expression): any {
  switch (expr.type) {
    case 'StringLiteral':
      return expr.value.replace(/\\/g, '/');
    case 'NumericLiteral':
      return expr.value;
    case 'ObjectExpression':
      return objectLiteralToJSON(expr);
    case 'ArrayExpression':
      return expr.elements.map((expr) => {
        if (expr) {
          if (expr.spread) {
            sutairuError('No support for array spreads');
          } else {
            return expressionToJSON(expr.expression);
          }
        } else {
          sutairuError('Unexpected empty value in array');
        }
      });
    case 'BooleanLiteral':
      return expr.value;
    case 'NullLiteral':
      return null;
    case 'BigIntLiteral':
      return expr.value;
    case 'UnaryExpression':
      return expr.operator === '-'
        ? -expressionToJSON(expr.argument)
        : expressionToJSON(expr.argument);
    default:
      sutairuError(
        `Sutariu function arguments must be explicitly written literals. Found ${expr.type}`,
      );
  }
}
