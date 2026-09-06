import { beforeEach, describe, expect, it, vi } from 'vitest';
import { highlightDiffCode, resetDiffHighlighter } from '../highlighter';

const { createHighlighter, codeToTokens, loadLanguage, getLoadedLanguages } = vi.hoisted(() => {
	const codeToTokens = vi.fn(() => ({ tokens: [[{ content: 'const', color: '#111' }]] }));
	const loadLanguage = vi.fn(async () => {});
	const getLoadedLanguages = vi.fn((): string[] => []);
	const createHighlighter = vi.fn(async () => ({
		codeToTokens,
		loadLanguage,
		getLoadedLanguages
	}));
	return { createHighlighter, codeToTokens, loadLanguage, getLoadedLanguages };
});

vi.mock('shiki', () => ({ createHighlighter }));
vi.mock('shiki/engine/javascript', () => ({ createJavaScriptRegexEngine: vi.fn(() => ({})) }));

beforeEach(() => {
	resetDiffHighlighter();
	createHighlighter.mockClear();
	codeToTokens.mockClear();
	loadLanguage.mockClear();
	getLoadedLanguages.mockReturnValue([]);
});

describe('highlightDiffCode', () => {
	it('returns null without touching shiki when the language is unknown', async () => {
		expect(await highlightDiffCode('some text', null)).toBeNull();
		expect(createHighlighter).not.toHaveBeenCalled();
	});

	it('loads the language on demand and returns per-line tokens', async () => {
		const tokens = await highlightDiffCode('const x = 1', 'typescript');

		expect(loadLanguage).toHaveBeenCalledWith('typescript');
		expect(codeToTokens).toHaveBeenCalledWith('const x = 1', {
			lang: 'typescript',
			themes: { light: 'github-light', dark: 'github-dark' },
			defaultColor: 'light-dark()'
		});
		expect(tokens).toEqual([[{ content: 'const', color: '#111' }]]);
	});

	it('skips loading languages that are already loaded', async () => {
		getLoadedLanguages.mockReturnValue(['typescript']);

		await highlightDiffCode('const x = 1', 'typescript');

		expect(loadLanguage).not.toHaveBeenCalled();
	});

	it('reuses one highlighter instance across calls', async () => {
		await highlightDiffCode('a', 'typescript');
		await highlightDiffCode('b', 'rust');

		expect(createHighlighter).toHaveBeenCalledTimes(1);
	});

	it('returns null when highlighting fails (unsupported language, engine error)', async () => {
		loadLanguage.mockRejectedValueOnce(new Error('no such language'));

		expect(await highlightDiffCode('x', 'not-a-language')).toBeNull();
	});
});
