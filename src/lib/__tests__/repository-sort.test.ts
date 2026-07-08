import { beforeEach, describe, expect, it } from 'vitest';
import {
	DEFAULT_REPOSITORY_SORT,
	REPOSITORY_SORT_OPTIONS,
	isRepositorySortMode,
	readPersistedSort,
	repositorySort,
	sortRepositories,
	type RepositorySortMode
} from '../repository-sort.svelte';

const repositories = [
	{ name: 'banana', branchesCount: 5 },
	{ name: 'apple', branchesCount: 5 },
	{ name: 'cherry', branchesCount: 1 },
	{ name: 'date', branchesCount: 10 }
];

const names = (mode: RepositorySortMode) =>
	sortRepositories(repositories, mode).map((repo) => repo.name);

describe('sortRepositories', () => {
	it('sorts by name ascending', () => {
		expect(names('name-asc')).toEqual(['apple', 'banana', 'cherry', 'date']);
	});

	it('sorts by name descending', () => {
		expect(names('name-desc')).toEqual(['date', 'cherry', 'banana', 'apple']);
	});

	it('sorts by most branches, tie-breaking on name', () => {
		expect(names('branches-desc')).toEqual(['date', 'apple', 'banana', 'cherry']);
	});

	it('sorts by fewest branches, tie-breaking on name', () => {
		expect(names('branches-asc')).toEqual(['cherry', 'apple', 'banana', 'date']);
	});

	it('does not mutate the input array', () => {
		const input = [...repositories];
		sortRepositories(input, 'name-desc');
		expect(input).toEqual(repositories);
	});
});

describe('isRepositorySortMode', () => {
	it('accepts every known sort option id', () => {
		for (const option of REPOSITORY_SORT_OPTIONS) {
			expect(isRepositorySortMode(option.id)).toBe(true);
		}
	});

	it('rejects unknown values', () => {
		expect(isRepositorySortMode('unknown')).toBe(false);
		expect(isRepositorySortMode(undefined)).toBe(false);
		expect(isRepositorySortMode(null)).toBe(false);
		expect(isRepositorySortMode(42)).toBe(false);
	});
});

describe('DEFAULT_REPOSITORY_SORT', () => {
	it('is a valid sort mode', () => {
		expect(isRepositorySortMode(DEFAULT_REPOSITORY_SORT)).toBe(true);
	});
});

describe('readPersistedSort', () => {
	const STORAGE_KEY = 'repository-nav-sort';

	beforeEach(() => {
		localStorage.clear();
	});

	it('returns a valid persisted value', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify('branches-desc'));
		expect(readPersistedSort()).toBe('branches-desc');
	});

	it('falls back to the default when the persisted value is invalid', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify('bogus'));
		expect(readPersistedSort()).toBe(DEFAULT_REPOSITORY_SORT);
	});

	it('falls back to the default when nothing is persisted', () => {
		expect(readPersistedSort()).toBe(DEFAULT_REPOSITORY_SORT);
	});
});

describe('repositorySort store', () => {
	const STORAGE_KEY = 'repository-nav-sort';

	beforeEach(() => {
		localStorage.clear();
		repositorySort.setMode(DEFAULT_REPOSITORY_SORT);
		localStorage.clear();
	});

	it('exposes the current mode and persists updates', () => {
		expect(repositorySort.mode).toBe(DEFAULT_REPOSITORY_SORT);

		repositorySort.setMode('name-desc');

		expect(repositorySort.mode).toBe('name-desc');
		expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('name-desc'));
	});
});
