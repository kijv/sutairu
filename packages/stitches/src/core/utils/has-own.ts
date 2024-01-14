const { hasOwnProperty } = Object.prototype;

export const hasOwn = <T extends Record<string, unknown>, K extends keyof T>(
	target: T,
	key: K,
) => hasOwnProperty.call(target, key);
