import { QueryClient } from '@tanstack/svelte-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPrefetchRepositoryData } from '../create-prefetch-repository-data';

// Hoist the mockQueryClient so it can be accessed in vi.mock
const { mockQueryClient } = vi.hoisted(() => {
	return {
		mockQueryClient: { current: null as QueryClient | null }
	};
});

vi.mock('@tanstack/svelte-query', async () => {
	const actual = await vi.importActual('@tanstack/svelte-query');
	return {
		...actual,
		useQueryClient: () => mockQueryClient.current
	};
});

// Mock the Tauri commands
vi.mock('$utils/tauri-commands', () => ({
	buildCommandExecutor: vi.fn((commandName) => {
		// Return different mock data based on command
		if (commandName === 'getBranchList') {
			return vi.fn(async () => ({ branches: [] }));
		}
		if (commandName === 'getRepository') {
			return vi.fn(async () => ({
				id: 'test-repo',
				name: 'Test Repo',
				path: '/path/to/repo',
				branches: [],
				currentBranch: 'main',
				branchesCount: 0
			}));
		}
		return vi.fn(async () => ({}));
	})
}));

describe('createPrefetchRepositoryData', () => {
	beforeEach(() => {
		mockQueryClient.current = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 5 * 60 * 1000 // 5 minutes to prevent premature garbage collection
				}
			}
		});
		vi.clearAllMocks();
	});

	it('should create a prefetch function', () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		expect(prefetchRepositoryData).toBeInstanceOf(Function);
	});

	it('should prefetch both branch list and repository data when called', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		const branchQueryKey = [
			'branch',
			'getBranchList',
			{ repoId: 'test-repo-id', filters: { deletionStatus: 'active' } }
		];
		const repoQueryKey = ['repository', 'getRepository', { id: 'test-repo-id' }];

		prefetchRepositoryData('test-repo-id');

		// Wait for debounce delay and prefetch to complete
		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(branchQueryKey)).toBeDefined();
				expect(mockQueryClient.current!.getQueryData(repoQueryKey)).toBeDefined();
			},
			{ timeout: 400 }
		);
	});

	it('should prefetch branch list with active deletion status filter', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData('test-repo-id');

		// Wait for debounce delay and prefetch to complete
		const expectedKey = [
			'branch',
			'getBranchList',
			{
				repoId: 'test-repo-id',
				filters: {
					deletionStatus: 'active'
				}
			}
		];

		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(expectedKey)).toBeDefined();
			},
			{ timeout: 400 }
		);
	});

	it('should prefetch repository with correct ID', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData('test-repo-id');

		// Wait for debounce delay and prefetch to complete
		const expectedKey = ['repository', 'getRepository', { id: 'test-repo-id' }];

		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(expectedKey)).toBeDefined();
			},
			{ timeout: 400 }
		);
	});

	it('should debounce multiple rapid calls', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		// Call multiple times rapidly
		prefetchRepositoryData('repo-1');
		prefetchRepositoryData('repo-2');
		prefetchRepositoryData('repo-3');

		// Wait for debounce delay and prefetch to complete
		const repo3BranchKey = [
			'branch',
			'getBranchList',
			{ repoId: 'repo-3', filters: { deletionStatus: 'active' } }
		];
		const repo3RepoKey = ['repository', 'getRepository', { id: 'repo-3' }];

		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(repo3BranchKey)).toBeDefined();
				expect(mockQueryClient.current!.getQueryData(repo3RepoKey)).toBeDefined();
			},
			{ timeout: 400 }
		);

		// Earlier calls should not be in cache
		const repo1BranchKey = [
			'branch',
			'getBranchList',
			{ repoId: 'repo-1', filters: { deletionStatus: 'active' } }
		];
		expect(mockQueryClient.current!.getQueryData(repo1BranchKey)).toBeUndefined();
	});

	it('should respect cache and not refetch if data already exists', async () => {
		// Pre-populate cache for both queries
		const branchQueryKey = [
			'branch',
			'getBranchList',
			{ repoId: 'test-repo-id', filters: { deletionStatus: 'active' } }
		];
		const repoQueryKey = ['repository', 'getRepository', { id: 'test-repo-id' }];

		const testBranchData = { branches: [{ name: 'existing-branch' }] };
		const testRepoData = {
			id: 'test-repo-id',
			name: 'Test Repo',
			path: '/path/to/repo',
			branches: [],
			currentBranch: 'main',
			branchesCount: 0
		};

		mockQueryClient.current!.setQueryData(branchQueryKey, testBranchData);
		mockQueryClient.current!.setQueryData(repoQueryKey, testRepoData);

		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData('test-repo-id');

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 250));

		// Data should remain the same (not refetched)
		expect(mockQueryClient.current!.getQueryData(branchQueryKey)).toEqual(testBranchData);
		expect(mockQueryClient.current!.getQueryData(repoQueryKey)).toEqual(testRepoData);
	});

	it('should handle different repository IDs correctly', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		// First prefetch
		prefetchRepositoryData('repo-1');

		const repo1BranchKey = [
			'branch',
			'getBranchList',
			{ repoId: 'repo-1', filters: { deletionStatus: 'active' } }
		];
		const repo1RepoKey = ['repository', 'getRepository', { id: 'repo-1' }];

		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(repo1BranchKey)).toBeDefined();
				expect(mockQueryClient.current!.getQueryData(repo1RepoKey)).toBeDefined();
			},
			{ timeout: 400 }
		);

		// Second prefetch with different ID
		prefetchRepositoryData('repo-2');

		const repo2BranchKey = [
			'branch',
			'getBranchList',
			{ repoId: 'repo-2', filters: { deletionStatus: 'active' } }
		];
		const repo2RepoKey = ['repository', 'getRepository', { id: 'repo-2' }];

		await vi.waitFor(
			() => {
				expect(mockQueryClient.current!.getQueryData(repo2BranchKey)).toBeDefined();
				expect(mockQueryClient.current!.getQueryData(repo2RepoKey)).toBeDefined();
			},
			{ timeout: 400 }
		);
	});
});
