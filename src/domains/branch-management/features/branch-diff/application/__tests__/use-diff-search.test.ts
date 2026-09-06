import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiffSearch } from '../use-diff-search.svelte';
import { reactiveHolder } from './reactive-holder.svelte';
import type { ChangedFile } from '$infrastructure/bindings';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { fetchQuery } = vi.hoisted(() => ({
	fetchQuery: vi.fn(async ({ queryKey }: { queryKey: [string, string, { filePath: string }] }) => ({
		path: queryKey[2].filePath,
		oldPath: null,
		status: 'modified',
		isBinary: false,
		truncated: false,
		hunks: [
			{
				header: '@@',
				oldStart: 1,
				oldLines: 1,
				newStart: 1,
				newLines: 1,
				lines: [
					{
						kind: 'added',
						content: queryKey[2].filePath.includes('match')
							? 'const needleValue = 1'
							: 'nothing here',
						oldLineNo: null,
						newLineNo: 1
					}
				]
			}
		]
	}))
}));

vi.mock('@tanstack/svelte-query', () => ({ useQueryClient: () => ({ fetchQuery }) }));

const file = (path: string, overrides: Partial<ChangedFile> = {}): ChangedFile => ({
	path,
	oldPath: null,
	status: 'modified',
	linesAdded: 1,
	linesRemoved: 0,
	isBinary: false,
	...overrides
});

beforeEach(() => {
	fetchQuery.mockClear();
});

describe('useDiffSearch', () => {
	const setup = (files: ChangedFile[]) => {
		const term = reactiveHolder('');
		const root = withEffectRoot(() =>
			useDiffSearch({
				getPath: () => '/repo',
				getBranchName: () => 'feature/x',
				getCommitSha: () => null,
				getFiles: () => files,
				getTerm: () => term.value
			})
		);
		flushSync();
		return { term, root };
	};

	it('matches everything while the term is empty, without fetching', () => {
		const files = [file('src/a.ts'), file('src/b.ts')];
		const { root } = setup(files);

		expect(files.every((f) => root.value.matches(f))).toBe(true);
		expect(fetchQuery).not.toHaveBeenCalled();
		root.cleanup();
	});

	it('matches by file path (and rename source) synchronously', () => {
		const files = [
			file('src/tabs.ts'),
			file('src/other.ts', { oldPath: 'src/tabs-old.ts', status: 'renamed' })
		];
		const { term, root } = setup(files);

		term.value = 'tabs';
		flushSync();

		expect(root.value.matches(files[0])).toBe(true);
		expect(root.value.matches(files[1])).toBe(true);
		root.cleanup();
	});

	it('matches by diff content after scanning through the cache', async () => {
		const files = [file('src/match-me.ts'), file('src/plain.ts')];
		const { term, root } = setup(files);

		term.value = 'needleValue';
		flushSync();

		await vi.waitFor(() => expect(root.value.isSearching).toBe(false));
		await vi.waitFor(() => expect(root.value.matches(files[0])).toBe(true));
		expect(root.value.matches(files[1])).toBe(false);
		root.cleanup();
	});

	it('skips binary files when scanning content', async () => {
		const files = [file('assets/logo.png', { isBinary: true }), file('src/match-me.ts')];
		const { term, root } = setup(files);

		term.value = 'needle';
		flushSync();
		await vi.waitFor(() => expect(fetchQuery).toHaveBeenCalled());

		const scannedPaths = fetchQuery.mock.calls.map(
			([{ queryKey }]) => (queryKey[2] as { filePath: string }).filePath
		);
		expect(scannedPaths).not.toContain('assets/logo.png');
		root.cleanup();
	});

	it('treats fetch failures as non-matches instead of throwing', async () => {
		fetchQuery.mockRejectedValueOnce(new Error('boom'));
		const files = [file('src/broken.ts')];
		const { term, root } = setup(files);

		term.value = 'needle';
		flushSync();

		await vi.waitFor(() => expect(root.value.isSearching).toBe(false));
		expect(root.value.matches(files[0])).toBe(false);
		root.cleanup();
	});

	it('reports content matches separately from path matches', async () => {
		const files = [file('src/match-me.ts'), file('src/needle-in-name.ts')];
		const { term, root } = setup(files);

		// Path-only match: isContentMatch stays false.
		term.value = 'needle-in-name';
		flushSync();
		await vi.waitFor(() => expect(root.value.isSearching).toBe(false));

		expect(root.value.matches(files[1])).toBe(true);
		expect(root.value.isContentMatch(files[1])).toBe(false);

		// Content match: the mocked diff of match-me.ts contains needleValue.
		term.value = 'needleValue';
		flushSync();
		await vi.waitFor(() => expect(root.value.isContentMatch(files[0])).toBe(true));
		root.cleanup();
	});

	it('clears content matches when the term is cleared', async () => {
		const files = [file('src/match-me.ts')];
		const { term, root } = setup(files);

		term.value = 'needleValue';
		flushSync();
		await vi.waitFor(() => expect(root.value.matches(files[0])).toBe(true));

		term.value = '';
		flushSync();

		expect(root.value.isSearching).toBe(false);
		expect(root.value.matches(files[0])).toBe(true); // empty term matches all
		root.cleanup();
	});
});
