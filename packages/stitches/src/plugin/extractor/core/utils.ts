import type * as SWC from '@swc/wasm';
import { stitchesError } from '../../../stitches-error';
import { expressionToJSON } from '../../ast/util';

export const jsonArguments = (args: SWC.Argument[]) =>
  args.map((exprOrSpread) => {
    if (exprOrSpread.spread) {
      stitchesError('`jujst/stitches` does not support spreads in functions');
    }

    return expressionToJSON(exprOrSpread.expression);
  });
