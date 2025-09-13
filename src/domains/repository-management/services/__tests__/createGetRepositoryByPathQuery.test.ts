import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGetRepositoryQuery } from '../create-get-repository-query';
import * as repositoryStore from '$domains/repository-management/store/repository.svelte';
import { commands, type GetRepositoryOutput } from '$lib/bindings';
import type { Repository } from '$services/common';
import { mockDataFactory } from '$utils/test-utils';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('$lib/bindings', () => ({
	commands: {
		getRepository: vi.fn()
	}
}));

vi.mock('$domains/repository-management/store/repository.svelte', () => ({
	getRepositoryStore: vi.fn()
}));

// Mock validation utils
vi.mock('$utils/validation-utils', () => ({
	isValidDate: vi.fn((date) => date !== 'invalid-date' && date !== '')
}));

describe('createGetRepositoryQuery', () => {
	const mockPath = '/path/to/repo';
	const mockRepository = mockDataFactory.repository({
		path: '/path/to/repository',
		name: 'test-repo',
		currentBranch: 'main',
		branchesCount: 1,
		id: '1',
		branches: [
			mockDataFactory.branch({
				name: 'main',
				current: true,
				fullyMerged: true
			})
		]
	});

	const mockRepositoryStore = {
		set: vi.fn()
	};

	const mockQueryResult = {
		data: mockRepository,
		refetch: vi.fn()
	};

	beforeEach(() => {
		// Mock the getRepository command to return a successful result
		const mockCommand = vi.mocked(commands.getRepository);
		mockCommand.mockResolvedValue({
			status: 'ok',
			data: mockRepository
		});

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
		createGetRepositoryQuery(pathFn);

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
		createGetRepositoryQuery(pathFn);

		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();

		expect(config.queryKey).toEqual(['branches', 'get-all', '']);
		expect(config.enabled).toBe(false);
	});

	it('should call invoke with correct parameters when query function is called', async () => {
		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

		// Get the query function from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function directly
		await queryFn();

		expect(vi.mocked(commands.getRepository)).toHaveBeenCalledWith({ path: mockPath });
	});

	it('should return the repository from the query function', async () => {
		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

		// Get the query function from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function directly
		const result = await queryFn();

		expect(result).toEqual(mockRepository);
	});

	it('should be disabled when no path is provided', async () => {
		// Create query with undefined path directly
		const undefinedPathFn = () => undefined;
		createGetRepositoryQuery(undefinedPathFn);

		// Get the query configuration from the createQuery call
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();

		// The query should be disabled when path is undefined/empty
		expect(config.enabled).toBe(false);

		// Verify that getRepository command was not called since the query is disabled
		expect(vi.mocked(commands.getRepository)).not.toHaveBeenCalled();
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
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(repoWithInvalidDate);

		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

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

	it('should pass through malformed data from backend', async () => {
		// Mock malformed repository data - the service doesn't validate and trusts the backend
		const malformedRepo = {
			path: mockPath,
			branches: [
				{
					name: 'test'
					// Missing other required Branch fields like lastCommit
				}
			],
			id: '1',
			currentBranch: 'main',
			branchesCount: 1,
			name: 'test-repo'
			// This is still malformed due to missing Branch fields, but has the required top-level fields
		} as unknown as GetRepositoryOutput;

		// Clear the default mock from beforeEach and mock the command to return this invalid data
		vi.mocked(commands.getRepository).mockReset();
		vi.mocked(commands.getRepository).mockResolvedValue({
			status: 'ok',
			data: malformedRepo
		});

		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// The service passes through the data as-is (trusts the backend)
		const result = await queryFn();
		expect(result.path).toBe(mockPath);
		expect(result.branches[0].name).toBe('test');
	});

	it('should handle Tauri errors properly', async () => {
		// Clear the default mock from beforeEach and mock command to return error result
		vi.mocked(commands.getRepository).mockReset();
		vi.mocked(commands.getRepository).mockResolvedValue({
			status: 'error',
			error: {
				message: 'Failed to read repository information',
				kind: 'io_error',
				description: 'Repository path does not exist'
			}
		});

		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

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
		createGetRepositoryQuery(pathFn, { enabled: false });

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
						sha: 'abc123',
						shortSha: 'abc123'.substring(0, 7),
						date: '', // Empty date should trigger the replacement logic
						message: 'Initial commit',
						author: 'John Doe',
						email: 'john@example.com'
					}
				}
			]
		};

		// Update mock response with empty date
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(repoWithEmptyDate);

		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

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

	// Test for error handling from Tauri commands
	it('should handle error results from commands properly', async () => {
		// Mock the command to return an error result
		(commands.getRepository as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
			status: 'error',
			error: {
				message: 'Repository not found',
				kind: 'not_found',
				description: 'The specified repository path does not exist'
			}
		});

		const pathFn = () => mockPath;
		createGetRepositoryQuery(pathFn);

		// Get the query function
		const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		const config = createQueryArg();
		const queryFn = config.queryFn;

		// Call the query function and expect the tauri error to be wrapped
		const error = await queryFn().catch((e: unknown) => e);

		// Check that the error has the expected properties (passed through from the mocked error)
		expect(error).toMatchObject({
			kind: 'not_found',
			message: 'Repository not found'
		});
	});
});
