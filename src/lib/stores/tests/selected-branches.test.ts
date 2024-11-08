import { getSelectedBranchesStore } from '../selected-branches.svelte';

describe('SelectedBranches', () => {
	let store: ReturnType<typeof getSelectedBranchesStore>;

	beforeEach(() => {
		localStorage.clear();
		store = getSelectedBranchesStore('test-repo');
		store.clear();
	});

	it('should add branches', () => {
		store.add(['branch1', 'branch2']);
		expect(store.list).toEqual(['branch1', 'branch2']);
	});

	it('should remove branches', () => {
		store.add(['branch1', 'branch2']);
		store.remove(['branch1']);
		expect(store.list).toEqual(['branch2']);
	});

	it('should clear branches', () => {
		store.add(['branch1', 'branch2']);
		store.clear();
		expect(store.list).toEqual([]);
	});

	it('should check if branch exists', () => {
		store.add(['branch1']);
		expect(store.has('branch1')).toBe(true);
		expect(store.has('branch2')).toBe(false);
	});

	it('should persist state in localStorage', () => {
		store.add(['branch1']);
		const newStore = getSelectedBranchesStore('test-repo');
		expect(newStore.list).toEqual(['branch1']);
	});

	it('should handle empty repository', () => {
		const emptyStore = getSelectedBranchesStore();
		expect(emptyStore.list).toEqual([]);
		emptyStore.add(['branch1']);
		expect(emptyStore.list).toEqual([]);
	});

	it('should handle non-existent branches', () => {
		expect(store.has('non-existent-branch')).toBe(false);
		store.remove(['non-existent-branch']);
		expect(store.list).toEqual([]);
	});

	it('should handle multiple repositories', () => {
		const store1 = getSelectedBranchesStore('repo1');
		const store2 = getSelectedBranchesStore('repo2');
		store1.add(['branch1']);
		store2.add(['branch2']);
		expect(store1.list).toEqual(['branch1']);
		expect(store2.list).toEqual(['branch2']);
	});

	it('should not add duplicate branches', () => {
		store.add(['branch1', 'branch1']);
		expect(store.list).toEqual(['branch1']);
	});

	it('should return empty list when repository has no selected branches', () => {
		expect(store.list).toEqual([]);
	});

	it('should return list of branches when repository has selected branches', () => {
		store.add(['branch1', 'branch2']);
		expect(store.list).toEqual(['branch1', 'branch2']);
	});

	it('should return list excluding missing branches', () => {
		store.add(['branch1', 'branch2']);
		store.remove(['branch2']);
		expect(store.list).toEqual(['branch1']);
	});

	it('should handle non-existent branches', () => {
		expect(store.has('non-existent-branch')).toBe(false);
		store.remove(['non-existent-branch']);
		expect(store.list).toEqual([]);
	});

	it('should handle multiple repositories', () => {
		const store1 = getSelectedBranchesStore('repo1');
		const store2 = getSelectedBranchesStore('repo2');
		store1.add(['branch1']);
		store2.add(['branch2']);
		expect(store1.list).toEqual(['branch1']);
		expect(store2.list).toEqual(['branch2']);
	});

	it('should not add duplicate branches', () => {
		store.add(['branch1', 'branch1']);
		expect(store.list).toEqual(['branch1']);
	});

	it('should return empty list when repository has no selected branches', () => {
		expect(store.list).toEqual([]);
	});

	it('should return list of branches when repository has selected branches', () => {
		store.add(['branch1', 'branch2']);
		expect(store.list).toEqual(['branch1', 'branch2']);
	});

	it('should return list excluding missing branches', () => {
		store.add(['branch1', 'branch2']);
		store.remove(['branch2']);
		expect(store.list).toEqual(['branch1']);
	});

	it('should return empty list when repository is not set', () => {
		const noRepoStore = getSelectedBranchesStore();
		expect(noRepoStore.list).toEqual([]);
		noRepoStore.add(['branch1']);
		expect(noRepoStore.list).toEqual([]);
		noRepoStore.remove(['branch1']);
		expect(noRepoStore.list).toEqual([]);
		noRepoStore.clear();
		expect(noRepoStore.list).toEqual([]);
	});
});
