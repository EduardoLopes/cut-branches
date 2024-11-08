import { repositories, RepositoriesStore, type Repository } from '../repositories.svelte';

describe('RepositoriesStore', () => {
	let repo1: Repository;
	let repo2: Repository;

	beforeEach(() => {
		localStorage.clear();
		repositories.clear();

		repo1 = {
			path: '/path/to/repo1',
			branches: [],
			name: 'Repo 1',
			currentBranch: 'main',
			branchesCount: 1,
			id: '1'
		};

		repo2 = {
			path: '/path/to/repo2',
			branches: [],
			name: 'Repo 2',
			currentBranch: 'main',
			branchesCount: 1,
			id: '2'
		};
	});

	it('should add a repository', () => {
		repositories.add(repo1);
		expect(repositories.first).toEqual(repo1);
	});

	it('should update an existing repository', () => {
		repositories.add(repo1);
		const updatedRepo1 = { ...repo1, name: 'Updated Repo 1' };
		repositories.add(updatedRepo1);
		expect(repositories.first?.name).toBe('Updated Repo 1');
	});

	it('should remove a repository by id', () => {
		repositories.add(repo1);
		repositories.add(repo2);
		repositories.remove(repo1.id);
		expect(repositories.first).toEqual(repo2);
	});

	it('should clear all repositories', () => {
		repositories.add(repo1);
		repositories.add(repo2);
		repositories.clear();
		expect(repositories.first).toBeUndefined();
	});

	it('should find a repository by path', () => {
		repositories.add(repo1);
		const foundRepo = repositories.findByPath(repo1.path);
		expect(foundRepo).toEqual(repo1);
	});

	it('should return undefined when findByPath is called without an argument', () => {
		const foundRepo = repositories.findByPath();
		expect(foundRepo).toBeUndefined();
	});

	it('should find a repository by id', () => {
		repositories.add(repo1);
		const foundRepo = repositories.findById(repo1.id);
		expect(foundRepo).toEqual(repo1);
	});

	it('should return undefined when findById is called without an argument', () => {
		const foundRepo = repositories.findById();
		expect(foundRepo).toBeUndefined();
	});

	it('should persist repositories in localStorage', () => {
		repositories.add(repo1);
		const storedValue = JSON.parse(localStorage.getItem('repositories') || '[]');
		expect(storedValue).toEqual([repo1]);
	});

	it('should load repositories from localStorage', () => {
		localStorage.setItem('repositories', JSON.stringify([repo1]));
		const newStore = new RepositoriesStore();
		expect(newStore.first).toEqual(repo1);
	});

	it('should update localStorage when a repository is removed', () => {
		repositories.add(repo1);
		repositories.add(repo2);
		repositories.remove(repo1.id);
		const storedValue = JSON.parse(localStorage.getItem('repositories') || '[]');
		expect(storedValue).toEqual([repo2]);
	});
});
