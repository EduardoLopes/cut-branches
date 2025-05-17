import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGetRepositoryByPathQuery } from '../createGetRepositoryByPathQuery';
import * as repositoryStore from '$lib/stores/repository.svelte';
import type { Repository } from '$lib/stores/repository.svelte';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('$lib/stores/repository.svelte', () => ({
	getRepositoryStore: vi.fn()
}));

describe('createGetRepositoryByPathQuery', () => {
	const mockPath = '/path/to/repo';
	const mockRepository: Repository = {
		path: mockPath,
		branches: [
			{
				name: 'main',
				current: true,
				last_commit: {
					hash: 'abc123',
					date: new Date().toISOString(),
					message: 'Initial commit',
					author: 'Test User',
					email: 'test@example.com'
				},
				fully_merged: true
			}
		],
		name: 'test-repo',
		currentBranch: 'main',
		branchesCount: 1,
		id: '123'
	};

	const mockRepositoryStore = {
		set: vi.fn()
	};

	const mockQueryResult = {
		data: mockRepository,
		refetch: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Setup the default success response
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify(mockRepository)
		);
		// Mock repository store
		(repositoryStore.getRepositoryStore as ReturnType<typeof vi.fn>).mockReturnValue(
			mockRepositoryStore
		);
		// Mock createQuery to return our mock query result
		vi.spyOn(svelteQuery, 'createQuery').mockImplementation(
			() => mockQueryResult as unknown as svelteQuery.CreateQueryResult<Repository, Error>
		);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should create a query with the correct configuration', () => {
		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		expect(svelteQuery.createQuery).toHaveBeenCalled();
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();

		expect(config.queryKey).toEqual(['branches', 'get-all', mockPath]);
		expect(typeof config.queryFn).toBe('function');
		expect(config.enabled).toBe(true);
	});

	it('should handle undefined path correctly', () => {
		const pathFn = () => undefined;
		createGetRepositoryByPathQuery(pathFn);

		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();

		expect(config.queryKey).toEqual(['branches', 'get-all', '']);
		expect(config.enabled).toBe(false);
	});

	it('should call invoke with correct parameters when query function is called', async () => {
		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function directly
		await queryFn();

		expect(invoke).toHaveBeenCalledWith('get_repo_info', { path: mockPath });
	});

	it('should return the repository from the query function', async () => {
		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function directly
		const result = await queryFn();

		expect(result).toEqual(mockRepository);
	});

	it('should pass custom options to createQuery', () => {
		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn, { enabled: false });

		// Get the query config from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();

		// Check that our custom option is passed through
		expect(config.enabled).toBe(false);
	});
});
