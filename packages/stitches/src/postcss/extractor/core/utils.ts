import type * as SWC from '@swc/wasm';
import { expressionToJSON } from '../../ast/util';
import { stitchesError } from '../../stitches-error';

export const jsonArguments = (args: SWC.Argument[]) =>
  args.map((exprOrSpread) => {
    if (exprOrSpread.spread) {
      stitchesError('No support for spreads in functions');
    }

    return expressionToJSON(exprOrSpread.expression);
  });
