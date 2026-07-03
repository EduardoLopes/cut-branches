import { describe, it, expect, beforeEach } from 'vitest';
import { getSearchBranchesStore, pruneOrphanedSearchKeys } from '../search-branches.svelte';
import { Store } from '$lib/store.svelte';

describe('getSearchBranchesStore', () => {
	it('should return undefined if no repository is provided', () => {
		expect(getSearchBranchesStore()).toBeUndefined();
	});

	it('should return an instance of Store if repository is provided', () => {
		const repository = 'test-repo';
		const store = getSearchBranchesStore(repository);
		expect(store).toBeInstanceOf(Store);
	});
});

describe('pruneOrphanedSearchKeys', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('removes search keys whose token matches no known repo id or name', () => {
		localStorage.setItem('store_search_alive-id-active', '"x"');
		localStorage.setItem('store_search_dead-id-active', '"y"');
		localStorage.setItem('store_search_dead-id-deleted', '"z"');

		pruneOrphanedSearchKeys([{ id: 'alive-id', name: 'alive-name' }]);

		expect(localStorage.getItem('store_search_alive-id-active')).toBe('"x"');
		expect(localStorage.getItem('store_search_dead-id-active')).toBeNull();
		expect(localStorage.getItem('store_search_dead-id-deleted')).toBeNull();
	});

	it('matches by repo name as well as id', () => {
		localStorage.setItem('store_search_repo-name-active', '"x"');

		pruneOrphanedSearchKeys([{ id: 'some-id', name: 'repo-name' }]);

		expect(localStorage.getItem('store_search_repo-name-active')).toBe('"x"');
	});

	it('preserves keys belonging to other stores', () => {
		localStorage.setItem('store_other_thing', '"x"');
		localStorage.setItem('unrelated', '"y"');

		pruneOrphanedSearchKeys([]);

		expect(localStorage.getItem('store_other_thing')).toBe('"x"');
		expect(localStorage.getItem('unrelated')).toBe('"y"');
	});

	it('ignores search keys without a known variant suffix', () => {
		localStorage.setItem('store_search_legacy-key', '"x"');

		pruneOrphanedSearchKeys([]);

		expect(localStorage.getItem('store_search_legacy-key')).toBe('"x"');
	});

	it('handles tokens that themselves contain dashes', () => {
		localStorage.setItem('store_search_my-cool-repo-active', '"x"');
		localStorage.setItem('store_search_orphan-repo-deleted', '"y"');

		pruneOrphanedSearchKeys([{ id: 'id-1', name: 'my-cool-repo' }]);

		expect(localStorage.getItem('store_search_my-cool-repo-active')).toBe('"x"');
		expect(localStorage.getItem('store_search_orphan-repo-deleted')).toBeNull();
	});

	it('is a no-op when given no repos and no orphan keys', () => {
		expect(() => pruneOrphanedSearchKeys([])).not.toThrow();
	});
});
