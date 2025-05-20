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

// Mock validation utils
vi.mock('$lib/utils/validation-utils', () => ({
	isValidDate: vi.fn((date) => date !== 'invalid-date' && date !== '')
}));

describe('createGetRepositoryByPathQuery', () => {
	const mockPath = '/path/to/repo';
	const mockRepository: Repository = {
		path: '/path/to/repository',
		branches: [
			{
				name: 'main',
				current: true,
				lastCommit: {
					hash: 'abc123',
					date: '2023-01-01',
					message: 'Initial commit',
					author: 'John Doe',
					email: 'john@example.com'
				},
				fullyMerged: true
			}
		],
		name: 'test-repo',
		currentBranch: 'main',
		branchesCount: 1,
		id: '1'
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

	it('should throw an error when no path is provided to the query function', async () => {
		// Create query with undefined path directly
		const undefinedPathFn = () => undefined;
		createGetRepositoryByPathQuery(undefinedPathFn);

		// Get the query function from the second createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Create a mock context that simulates the queryKey with empty path
		const mockQueryContext = {
			queryKey: ['branches', 'get-all', '']
		};

		// Call the query function directly with the mock context and expect it to throw
		await expect(queryFn(mockQueryContext)).rejects.toMatchObject({
			message: 'No path provided',
			kind: 'missing_path',
			description: 'A repository path is required to fetch repository data'
		});

		// Verify that invoke was not called
		expect(invoke).not.toHaveBeenCalled();
	});

	it('should handle repository data with invalid dates', async () => {
		// Mock repository with invalid date
		const repoWithInvalidDate = {
			...mockRepository,
			branches: [
				{
					...mockRepository.branches[0],
					lastCommit: {
						...mockRepository.branches[0].lastCommit,
						date: 'invalid-date'
					}
				}
			]
		};

		// Update mock response with invalid date
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify(repoWithInvalidDate)
		);

		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function
		const result = await queryFn();

		// Expect that the invalid date was replaced with a valid date
		expect(result.branches[0].lastCommit.date).not.toBe('invalid-date');
		expect(new Date(result.branches[0].lastCommit.date).getTime()).not.toBeNaN();
	});

	it('should handle Zod validation errors', async () => {
		// Mock malformed repository data
		const malformedRepo = {
			path: mockPath,
			// Missing required fields
			branches: [{ name: 'test' }], // Missing required lastCommit
			id: '1'
			// Missing name and currentBranch
		};

		// Update mock response with invalid data
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify(malformedRepo)
		);

		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Simply check that it rejects with an error
		await expect(queryFn()).rejects.toBeTruthy();
	});

	it('should handle Tauri errors properly', async () => {
		// Setup a mock Tauri error
		const tauriError = {
			__TAURI_ERROR__: true,
			message: 'Failed to read repository information',
			stack: 'Error stack trace'
		};
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(tauriError);

		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Using partial matching for just the message
		await expect(queryFn()).rejects.toMatchObject({
			message: 'Failed to read repository information'
		});
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

	// Test for line 41 - branch with missing lastCommit field
	it('should handle repository data with missing lastCommit fields', async () => {
		// Modify the repository data to include a branch with an empty date field
		// but still conforming to the schema
		const repoWithEmptyDate = {
			...mockRepository,
			branches: [
				{
					...mockRepository.branches[0],
					lastCommit: {
						hash: 'abc123',
						date: '', // Empty date should trigger the replacement logic
						message: 'Initial commit',
						author: 'John Doe',
						email: 'john@example.com'
					}
				}
			]
		};

		// Update mock response with empty date
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
			JSON.stringify(repoWithEmptyDate)
		);

		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function
		const result = await queryFn();

		// Expect that the empty date was replaced with a valid date
		expect(result.branches[0].lastCommit.date).not.toBe('');
		expect(new Date(result.branches[0].lastCommit.date).getTime()).not.toBeNaN();
	});

	// Test for line 64 - error object with custom kind but not a ServiceError
	it('should handle error objects with custom kind property', async () => {
		// Create a custom error with a kind property but not a complete ServiceError
		const customError = {
			kind: 'custom_error',
			message: 'Custom error message',
			// Missing description field
			additionalField: 'extra data'
		};

		// Mock the invoke function to throw this custom error
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(customError);

		const pathFn = () => mockPath;
		createGetRepositoryByPathQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function and expect the error to be passed through
		const error = await queryFn().catch((e: unknown) => e);

		// Only check that the custom properties match
		expect(error).toMatchObject({
			kind: 'custom_error',
			message: 'Custom error message',
			additionalField: 'extra data'
		});
	});
});
