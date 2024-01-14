import safeJSONStringify from 'safe-json-stringify';

const stringifyReplacer = (name: unknown, data: unknown) => {
  if (typeof data === 'function') {
    return {
      '()': Function.prototype.toString.call(data),
    };
  }

  return data;
};

const stringify = (value: object) =>
  safeJSONStringify(value, stringifyReplacer);

export const createMemo = () => {
  const cache = Object.create(null);

  return (
    value: Record<string, unknown>,
    apply: (...args: any[]) => unknown,
    ...args: unknown[]
  ) => {
    const vjson = stringify(value);

    if (vjson in cache) {
      return cache[vjson];
    }
    const result = apply(value, ...args);
    cache[vjson] = result;
    return result;
  };
};
