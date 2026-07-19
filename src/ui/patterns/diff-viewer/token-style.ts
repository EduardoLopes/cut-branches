import type { ThemedToken } from 'shiki';

/**
 * Inline style for one shiki token. shiki emits `htmlStyle` either as a
 * ready-made string or a property map depending on the API path; normalize
 * both, falling back to the token's plain color. `undefined` means "inherit"
 * (plain text).
 */
export function tokenStyle(token: ThemedToken): string | undefined {
	const { htmlStyle } = token;
	if (!htmlStyle) {
		return token.color ? `color:${token.color}` : undefined;
	}
	if (typeof htmlStyle === 'string') {
		return htmlStyle;
	}
	return Object.entries(htmlStyle)
		.map(([property, value]) => `${property}:${value}`)
		.join(';');
}
