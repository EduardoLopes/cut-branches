import { describe, it, expect, vi } from 'vitest';
import { getRepositoryStore, RepositoryStore } from '../repository.svelte';
import { goto } from '$app/navigation';

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('getRepositoryStore', () => {
	it('should return undefined if no repository is provided', () => {
		expect(getRepositoryStore()).toBeUndefined();
	});

	it('should return an instance of RepositoryStore if repository is provided', () => {
		const repository = 'test-repo';
		const store = getRepositoryStore(repository);
		expect(store).toBeInstanceOf(RepositoryStore);
	});
});

describe('RepositoryStore', () => {
	it('should add repository name to repositories set on set', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};
		store.set(repoData);
		expect(goto).toHaveBeenCalledWith(`/repos/${repoData.name}`);
		expect(RepositoryStore.repositories.has(repoData.name)).toBe(true);
	});

	it('should remove repository name from repositories set on clear', () => {
		const repository = 'test-repo';
		const store = new RepositoryStore(repository);
		const repoData = {
			name: 'repo-name',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0,
			id: 'unique-id'
		};
		store.set(repoData);
		store.clear();
		expect(RepositoryStore.repositories.has(repoData.name)).toBe(false);
	});
});
