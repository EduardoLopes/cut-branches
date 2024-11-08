import { getLockedBranchesStore } from '../locked-branches.svelte';

describe('LockedBranches', () => {
	let store: ReturnType<typeof getLockedBranchesStore>;
	const repository = 'test-repo';

	beforeEach(() => {
		localStorage.clear();
		store = getLockedBranchesStore(repository);
	});

	it('should initialize with empty locked branches', () => {
		expect(store.list).toEqual([]);
	});

	it('should add branches to the locked list', () => {
		store.add(['branch1', 'branch2']);
		expect(store.list).toEqual(['branch1', 'branch2']);
	});

	it('should remove branches from the locked list', () => {
		store.add(['branch1', 'branch2']);
		store.remove(['branch1']);
		expect(store.list).toEqual(['branch2']);
	});

	it('should clear all locked branches', () => {
		store.add(['branch1', 'branch2']);
		store.clear();
		expect(store.list).toEqual([]);
	});

	it('should check if a branch is locked', () => {
		store.add(['branch1']);
		expect(store.has('branch1')).toBe(true);
		expect(store.has('branch2')).toBe(false);
	});

	it('should persist locked branches to localStorage', () => {
		store.add(['branch1']);
		const newStore = getLockedBranchesStore(repository);
		expect(newStore.list).toEqual(['branch1']);
	});

	it('should retrieve locked branches from localStorage', () => {
		localStorage.setItem('locked', JSON.stringify({ 'test-repo': ['branch1', 'branch2'] }));
		const newStore = getLockedBranchesStore(repository);
		expect(newStore.list).toEqual(['branch1', 'branch2']);
	});

	it('should handle no repository specified', () => {
		const storeWithoutRepo = getLockedBranchesStore();
		expect(storeWithoutRepo.list).toEqual([]);
		storeWithoutRepo.add(['branch1']);
		expect(storeWithoutRepo.list).toEqual([]);
		expect(storeWithoutRepo.has('branch1')).toBe(false);
	});

	it('should not remove branches if no repository is specified', () => {
		const storeWithoutRepo = getLockedBranchesStore();
		storeWithoutRepo.add(['branch1']);
		storeWithoutRepo.remove(['branch1']);
		expect(storeWithoutRepo.list).toEqual([]);
	});

	it('should not clear branches if no repository is specified', () => {
		const storeWithoutRepo = getLockedBranchesStore();
		storeWithoutRepo.add(['branch1']);
		storeWithoutRepo.clear();
		expect(storeWithoutRepo.list).toEqual([]);
	});
});
