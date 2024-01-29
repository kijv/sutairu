export const define = <T>(target: T, source: any): T =>
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
