/**
 * Lazy, shared shiki highlighter for diff rendering.
 *
 * One highlighter instance serves every diff panel; languages load on demand
 * the first time a file of that type is expanded. The JS regex engine avoids
 * shipping/loading the oniguruma wasm blob.
 *
 * Themes: tokens are emitted with `light-dark()` colors, so they follow the
 * app theme automatically — pindoba's theme-mode script sets
 * `document.documentElement.style.colorScheme`, which is exactly what
 * `light-dark()` responds to. No extra CSS wiring needed.
 */

import {
	createHighlighter,
	type BundledLanguage,
	type HighlighterGeneric,
	type ThemedToken
} from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

type DiffHighlighter = HighlighterGeneric<BundledLanguage, string>;

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';

let highlighterPromise: Promise<DiffHighlighter> | null = null;

function getHighlighter(): Promise<DiffHighlighter> {
	highlighterPromise ??= createHighlighter({
		themes: [LIGHT_THEME, DARK_THEME],
		// Languages load lazily per file type (see highlightDiffCode).
		langs: [],
		engine: createJavaScriptRegexEngine({ forgiving: true })
	}) as Promise<DiffHighlighter>;
	return highlighterPromise;
}

/** Test hook: drop the shared instance so each test starts cold. */
export function resetDiffHighlighter(): void {
	highlighterPromise = null;
}

/**
 * Tokenize `code` (one hunk's lines joined with `\n`) in `lang`.
 *
 * Returns one token array per input line — the caller zips them back onto
 * the diff lines. Returns `null` when the language is unknown/unsupported or
 * highlighting fails, in which case the caller renders plain text. Never
 * throws: highlighting is progressive enhancement, not a load-bearing step.
 */
export async function highlightDiffCode(
	code: string,
	lang: string | null
): Promise<ThemedToken[][] | null> {
	if (!lang) {
		return null;
	}
	try {
		const highlighter = await getHighlighter();
		if (!highlighter.getLoadedLanguages().includes(lang)) {
			await highlighter.loadLanguage(lang as BundledLanguage);
		}
		const { tokens } = highlighter.codeToTokens(code, {
			lang: lang as BundledLanguage,
			themes: { light: LIGHT_THEME, dark: DARK_THEME },
			defaultColor: 'light-dark()'
		});
		return tokens;
	} catch {
		return null;
	}
}
