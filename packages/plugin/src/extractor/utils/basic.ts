export const removeDups: <T>(array: T[]) => T[] = (array) => {
  return [...new Set(array)];
};
