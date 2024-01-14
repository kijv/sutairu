export const hasNames = (target: Record<string, unknown>) => {
	for (const name in target) return true;
	return false;
};
