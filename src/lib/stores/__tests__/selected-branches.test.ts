import { describe, it, expect } from 'vitest';
import { SetStore } from '../../utils/set-store.svelte';
import { getSelectedBranchesStore } from '../selected-branches.svelte';

describe('getSelectedBranchesStore', () => {
	it('should return undefined if no repository is provided', () => {
		expect(getSelectedBranchesStore()).toBeUndefined();
	});

	it('should return an instance of SetStore if repository is provided', () => {
		const repository = 'test-repo';
		const store = getSelectedBranchesStore(repository);
		expect(store).toBeInstanceOf(SetStore);
	});
});
