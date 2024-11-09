import { getSearchBranchesStore } from '../search-branches.svelte';

describe('SearchBranches', () => {
	let searchBranches: ReturnType<typeof getSearchBranchesStore>;

	beforeEach(() => {
		localStorage.clear();
		searchBranches = getSearchBranchesStore('test-repo');
	});

	test('should initialize with undefined query', () => {
		expect(searchBranches.query).toBeUndefined();
	});

	test('should set and get query', () => {
		searchBranches.set('test-query');
		expect(searchBranches.query).toBe('test-query');
	});

	test('should update localStorage when setting query', () => {
		searchBranches.set('test-query');
		expect(localStorage.getItem('search_test-repo')).toBe(JSON.stringify('test-query'));
	});

	test('should clear query', () => {
		searchBranches.set('test-query');
		searchBranches.clear();
		expect(searchBranches.query).toBeUndefined();
		expect(localStorage.getItem('search_test-repo')).toBeNull();
	});

	test('should remove item from localStorage on destroy', () => {
		searchBranches.set('test-query');
		searchBranches.destroy();
		expect(localStorage.getItem('search_test-repo')).toBeNull();
	});

	test('should retrieve existing query from localStorage', () => {
		localStorage.setItem('search_test-repo', JSON.stringify('existing-query'));
		searchBranches = getSearchBranchesStore('test-repo');
		expect(searchBranches.query).toBe('existing-query');
	});

	test('should update query when storage event is triggered', () => {
		searchBranches.set('initial-query');
		expect(searchBranches.query).toBe('initial-query');

		// Simulate storage event
		localStorage.setItem('search_test-repo', JSON.stringify('updated-query'));
		window.dispatchEvent(new StorageEvent('storage', { key: 'search_test-repo' }));

		expect(searchBranches.query).toBe('updated-query');
	});
});
