import { describe, it, expect } from 'vitest';
import { getSearchBranchesStore } from '../search-branches.svelte';
import { Store } from '$utils/store.svelte';

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
