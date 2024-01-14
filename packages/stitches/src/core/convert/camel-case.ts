/** Returns the given value converted to camel-case. */
export const toCamelCase = (value: string) =>
  !/[A-Z]/.test(value)
    ? value.replace(/-[^]/g, (capital) => capital[1]!.toUpperCase())
    : value;
