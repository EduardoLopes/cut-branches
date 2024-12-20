import { describe, it, expect } from 'vitest';
import { SetStore } from '../../utils/set-store.svelte';
import { getLockedBranchesStore } from '../locked-branches.svelte';

describe('getLockedBranchesStore', () => {
	it('should return undefined if no repository is provided', () => {
		expect(getLockedBranchesStore()).toBeUndefined();
	});

	it('should return an instance of SetStore if repository is provided', () => {
		const repository = 'test-repo';
		const store = getLockedBranchesStore(repository);
		expect(store).toBeInstanceOf(SetStore);
	});
});
