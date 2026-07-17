import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	COMMIT_HISTORY_PAGE_SIZE,
	createListCommitHistoryInfiniteQuery
} from '../create-list-commit-history-infinite-query';

interface CapturedConfig {
	queryKey: () => unknown[];
	input: () => Record<string, unknown>;
	withPageParam: (base: Record<string, unknown>, cursor: string | null) => Record<string, unknown>;
	getNextPageParam: (lastPage: { nextCursor: string | null }) => string | undefined;
	initialPageParam: string | null;
	enabled: () => boolean;
	staleTime?: number;
}

const { holder } = vi.hoisted(() => ({
	holder: { config: null as CapturedConfig | null }
}));

vi.mock('$infrastructure/create-tauri-infinite-query', () => ({
	createTauriInfiniteQuery: (_command: string, config: CapturedConfig) => {
		holder.config = config;
		return { subscribe: vi.fn() };
	}
}));

const captured = (): CapturedConfig => {
	if (!holder.config) throw new Error('adapter did not configure the query');
	return holder.config;
};

beforeEach(() => {
	holder.config = null;
});

describe('createListCommitHistoryInfiniteQuery', () => {
	const input = () => ({ repoId: 'repo-1', path: '/repo', limit: 50 });

	it('keys the query with the owning repoId plus the wire input', () => {
		createListCommitHistoryInfiniteQuery(input);
		expect(captured().queryKey()).toEqual([
			'commit-history',
			'listCommitHistory',
			{ repoId: 'repo-1', path: '/repo', limit: 50 }
		]);
	});

	it('keeps repoId out of the wire input and defaults the page size', () => {
		createListCommitHistoryInfiniteQuery(() => ({ repoId: 'repo-1', path: '/repo' }));
		expect(captured().input()).toEqual({ path: '/repo', limit: COMMIT_HISTORY_PAGE_SIZE });
	});

	it('merges the cursor into the input only from the second page on', () => {
		createListCommitHistoryInfiniteQuery(input);
		const base = { path: '/repo', limit: 50 };
		expect(captured().withPageParam(base, null)).toEqual(base);
		expect(captured().withPageParam(base, 'digest:50')).toEqual({
			...base,
			cursor: 'digest:50'
		});
		expect(captured().initialPageParam).toBeNull();
	});

	it('continues paging from nextCursor and stops on the last page', () => {
		createListCommitHistoryInfiniteQuery(input);
		expect(captured().getNextPageParam({ nextCursor: 'digest:100' })).toBe('digest:100');
		expect(captured().getNextPageParam({ nextCursor: null })).toBeUndefined();
	});

	it('is disabled until the repository path is known', () => {
		let path = '';
		createListCommitHistoryInfiniteQuery(() => ({ repoId: 'repo-1', path }));
		expect(captured().enabled()).toBe(false);
		path = '/repo';
		expect(captured().enabled()).toBe(true);
	});

	it('forwards extra options', () => {
		createListCommitHistoryInfiniteQuery(input, { staleTime: 99 });
		expect(captured().staleTime).toBe(99);
	});
});
