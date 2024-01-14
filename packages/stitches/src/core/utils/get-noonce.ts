export const getNonce = () => {
	// @ts-expect-error
	if (typeof window.__webpack_nonce__ !== 'undefined')
		return window.__webpack_nonce__;
	// @ts-expect-error
	if (typeof window.nonce !== 'undefined') return window.nonce;
	return null;
};
