/**
 * Diff search composable: filters the changed-files list by file path AND by
 * diff content (the added/removed/context lines of each file's hunks).
 *
 * Path matching is synchronous. Content matching fetches each non-binary
 * file's diff through the query cache — the same cache entries the diff
 * panels use, so panels opened after a search render instantly. Fetches are
 * debounced and generation-guarded so a fast typer never sees stale results.
 */

import { useQueryClient, type QueryClient } from '@tanstack/svelte-query';
import debounce from 'just-debounce-it';
import { SvelteMap } from 'svelte/reactivity';
import type { ChangedFile, GetFileDiffOutput } from '$infrastructure/bindings';
import { executeCommand } from '$infrastructure/tauri-commands';

/** Same staleness the panels tolerate; invalidation flows through resources. */
const DIFF_STALE_TIME = 1000 * 30;
const SEARCH_DEBOUNCE_MS = 250;

interface UseDiffSearchProps {
	getPath: () => string;
	getBranchName: () => string | null;
	getCommitSha: () => string | null;
	getFiles: () => ChangedFile[];
	getTerm: () => string;
}

/** Fetches one file's diff through the cache, keyed exactly like the panel's
 *  `createGetFileDiffQuery` so both share the entry. */
function fetchFileDiff(
	queryClient: QueryClient,
	input: {
		path: string;
		branchName: string | null;
		commitSha: string | null;
		filePath: string;
		oldPath: string | null;
	}
): Promise<GetFileDiffOutput> {
	return queryClient.fetchQuery({
		queryKey: ['file-diff', 'getFileDiff', input],
		queryFn: () => executeCommand('getFileDiff', input),
		staleTime: DIFF_STALE_TIME
	});
}

function diffContainsTerm(diff: GetFileDiffOutput, term: string): boolean {
	return diff.hunks.some((hunk) =>
		hunk.lines.some((line) => line.content.toLowerCase().includes(term))
	);
}

export function useDiffSearch({
	getPath,
	getBranchName,
	getCommitSha,
	getFiles,
	getTerm
}: UseDiffSearchProps) {
	const queryClient = useQueryClient();

	/** file path → whether its diff content matches the current term. */
	const contentMatches = new SvelteMap<string, boolean>();
	let isSearching = $state(false);
	// Guards against out-of-order async completions when the term changes
	// while a scan is in flight.
	let generation = 0;

	async function scan(term: string) {
		const scanGeneration = ++generation;
		isSearching = true;

		const files = getFiles().filter((file) => !file.isBinary);
		await Promise.all(
			files.map(async (file) => {
				let matches = false;
				try {
					const diff = await fetchFileDiff(queryClient, {
						path: getPath(),
						branchName: getBranchName(),
						commitSha: getCommitSha(),
						filePath: file.path,
						oldPath: file.oldPath
					});
					matches = diffContainsTerm(diff, term);
				} catch {
					// A file whose diff can't load simply doesn't content-match;
					// the panel surfaces the underlying error when opened.
				}
				if (generation === scanGeneration) {
					contentMatches.set(file.path, matches);
				}
			})
		);

		if (generation === scanGeneration) {
			isSearching = false;
		}
	}

	const debouncedScan = debounce((term: string) => void scan(term), SEARCH_DEBOUNCE_MS);

	$effect(() => {
		const term = getTerm().trim().toLowerCase();
		// Track the file list too: a refetch (or late load) re-scans.
		const fileCount = getFiles().length;

		if (!term || fileCount === 0) {
			generation += 1;
			contentMatches.clear();
			isSearching = false;
			return;
		}
		debouncedScan(term);
	});

	function matches(file: ChangedFile): boolean {
		const term = getTerm().trim().toLowerCase();
		if (!term) {
			return true;
		}
		if (
			file.path.toLowerCase().includes(term) ||
			(file.oldPath?.toLowerCase().includes(term) ?? false)
		) {
			return true;
		}
		return contentMatches.get(file.path) === true;
	}

	/** Whether the file's diff CONTENT matches (path-only matches excluded) —
	 *  the signal the view uses to auto-expand a row's diff. */
	function isContentMatch(file: ChangedFile): boolean {
		return getTerm().trim().length > 0 && contentMatches.get(file.path) === true;
	}

	return {
		matches,
		isContentMatch,
		get isSearching() {
			return isSearching;
		}
	};
}
