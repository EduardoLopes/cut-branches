import { QueryClient } from '@tanstack/svelte-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDebouncedTauriPrefetcher, type TauriFetchQueryOptions } from '../create-tauri-query';
import type { CommandName } from '../tauri-commands';

// Mock the Tauri commands with proper return data
vi.mock('../tauri-commands', () => ({
	buildCommandExecutor: vi.fn((commandName: string) => {
		return vi.fn(async (params?: unknown) => {
			// Return appropriate mock data based on command
			if (commandName === 'getBranchList') {
				return { branches: [{ name: 'test-branch' }] };
			}
			if (commandName === 'getRepository') {
				return {
					id: (params as { id?: string })?.id || 'test-repo',
					name: 'Test Repo',
					path: '/test/path',
					branches: [],
					currentBranch: 'main',
					branchesCount: 0
				};
			}
			return {};
		});
	})
}));

describe('createDebouncedTauriPrefetcher', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 5 * 60 * 1000 // 5 minutes to prevent premature garbage collection
				}
			}
		});
		vi.clearAllMocks();
	});

	it('should create a debounced prefetch function', () => {
		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			{
				input: { repoId: 'test-repo', filters: {} }
			}
		);

		expect(debouncedPrefetch).toBeInstanceOf(Function);
	});

	it('should call prefetchQuery after debounce delay', async () => {
		const config: TauriFetchQueryOptions<CommandName> = {
			input: { repoId: 'test-repo', filters: {} }
		};

		const queryKey = ['branch', 'getBranchList', { repoId: 'test-repo', filters: {} }];

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			config,
			50 // 50ms delay for faster test
		);

		debouncedPrefetch();

		// Should not be in cache immediately
		expect(queryClient.getQueryData(queryKey)).toBeUndefined();

		// Wait for debounce delay and prefetch to complete
		await vi.waitFor(
			() => {
				expect(queryClient.getQueryData(queryKey)).toBeDefined();
			},
			{ timeout: 500 }
		);
	});

	it('should debounce multiple rapid calls into a single prefetch', async () => {
		const queryKey = ['branch', 'getBranchList', { repoId: 'test-repo', filters: {} }];

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			{
				input: { repoId: 'test-repo', filters: {} }
			},
			50 // 50ms delay
		);

		// Call multiple times rapidly
		debouncedPrefetch();
		debouncedPrefetch();
		debouncedPrefetch();

		// Should not be in cache yet
		expect(queryClient.getQueryData(queryKey)).toBeUndefined();

		// Wait for debounce delay and prefetch to complete
		await vi.waitFor(
			() => {
				expect(queryClient.getQueryData(queryKey)).toBeDefined();
			},
			{ timeout: 500 }
		);
	});

	it('should use default debounce delay of 200ms when not specified', async () => {
		const queryKey = ['branch', 'getBranchList', { repoId: 'test-repo', filters: {} }];

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			{
				input: { repoId: 'test-repo', filters: {} }
			}
			// No delay specified - should use default 200ms
		);

		debouncedPrefetch();

		// Should not be in cache before 200ms
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(queryClient.getQueryData(queryKey)).toBeUndefined();

		// Wait for default delay and prefetch to complete
		await vi.waitFor(
			() => {
				expect(queryClient.getQueryData(queryKey)).toBeDefined();
			},
			{ timeout: 1000 }
		);
	});

	it('should respect cache and not refetch if data exists', async () => {
		const config: TauriFetchQueryOptions<CommandName> = {
			input: { repoId: 'test-repo', filters: {} }
		};

		// Pre-populate the cache with test data
		const queryKey = ['branch', 'getBranchList', { repoId: 'test-repo', filters: {} }];
		const testData = { branches: [{ name: 'existing-branch' }] };
		queryClient.setQueryData(queryKey, testData);

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			config,
			50
		);

		debouncedPrefetch();

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Data should remain the same (not refetched)
		expect(queryClient.getQueryData(queryKey)).toEqual(testData);
	});

	it('should work with different command types', async () => {
		const getRepositoryConfig: TauriFetchQueryOptions<CommandName> = {
			input: { id: 'test-repo' }
		};

		const queryKey = ['repository', 'getRepository', { id: 'test-repo' }];

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getRepository' as CommandName,
			getRepositoryConfig,
			50
		);

		debouncedPrefetch();

		// Wait for debounce delay and prefetch to complete
		await vi.waitFor(
			() => {
				expect(queryClient.getQueryData(queryKey)).toBeDefined();
			},
			{ timeout: 500 }
		);
	});

	it('should handle rapid successive calls correctly', async () => {
		const queryKey = ['branch', 'getBranchList', { repoId: 'test-repo', filters: {} }];

		const debouncedPrefetch = createDebouncedTauriPrefetcher(
			queryClient,
			'getBranchList' as CommandName,
			{
				input: { repoId: 'test-repo', filters: {} }
			},
			50 // 50ms delay
		);

		// Make several rapid calls
		debouncedPrefetch();
		await new Promise((resolve) => setTimeout(resolve, 10));
		debouncedPrefetch();
		await new Promise((resolve) => setTimeout(resolve, 10));
		debouncedPrefetch();

		// Should not be in cache immediately
		expect(queryClient.getQueryData(queryKey)).toBeUndefined();

		// Wait for the debounced prefetch to complete
		await vi.waitFor(
			() => {
				expect(queryClient.getQueryData(queryKey)).toBeDefined();
			},
			{ timeout: 500 }
		);

		// Verify data is in cache
		expect(queryClient.getQueryData(queryKey)).toBeDefined();
	});
});
