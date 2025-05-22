import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeleteBranchesMutation } from '../createDeleteBranchesMutation';
import type { Branch } from '$lib/services/common';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('createDeleteBranchesMutation', () => {
	const mockPath = '/path/to/repo';
	const mockBranches: Branch[] = [
		{
			name: 'branch-1',
			current: false,
			lastCommit: {
				sha: 'abc123',
				shortSha: 'abc123'.substring(0, 7),
				date: '2023-01-01',
				message: 'Commit 1',
				author: 'Test User',
				email: 'test@example.com'
			},
			fullyMerged: false
		},
		{
			name: 'branch-2',
			current: false,
			lastCommit: {
				sha: 'def456',
				shortSha: 'def456'.substring(0, 7),
				date: '2023-01-02',
				message: 'Commit 2',
				author: 'Test User',
				email: 'test@example.com'
			},
			fullyMerged: false
		}
	];
	const mockSuccessResponse = JSON.stringify([
		{
			branch: {
				name: 'branch-1',
				lastCommit: {
					sha: 'abc123',
					shortSha: 'abc123'.substring(0, 7),
					date: '2023-01-01',
					message: 'Initial commit',
					author: 'Test User',
					email: 'test@example.com'
				},
				current: false,
				fullyMerged: true,
				isRemote: false,
				isLocked: false
			},
			raw_output: 'Deleted branch feature/branch1'
		},
		{
			branch: {
				name: 'branch-2',
				lastCommit: {
					sha: 'def456',
					shortSha: 'def456'.substring(0, 7),
					date: '2023-01-02',
					message: 'Second commit',
					author: 'Test User',
					email: 'test@example.com'
				},
				current: false,
				fullyMerged: true,
				isRemote: false,
				isLocked: false
			},
			raw_output: 'Deleted branch feature/branch2'
		}
	]);
	const mockMutationResult = {
		mutate: vi.fn(),
		mutateAsync: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Setup the default success response
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);
		// Mock createMutation to return our mock mutation result
		// @ts-expect-error - Mock implementation for testing
		vi.spyOn(svelteQuery, 'createMutation').mockImplementation(() => mockMutationResult);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should create a mutation with the correct configuration', () => {
		createDeleteBranchesMutation();

		expect(svelteQuery.createMutation).toHaveBeenCalled();
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();

		expect(config.mutationKey).toEqual(['branches', 'delete']);
		expect(typeof config.mutationFn).toBe('function');
	});

	it('should call invoke with correct parameters when mutation function is called', async () => {
		createDeleteBranchesMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly
		await mutationFn({ path: mockPath, branches: mockBranches });

		expect(invoke).toHaveBeenCalledWith('delete_branches', {
			path: mockPath,
			branches: mockBranches.map((item) => item.name)
		});
	});

	it('should return the processed response from invoke when mutation function is called', async () => {
		createDeleteBranchesMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly
		const result = await mutationFn({ path: mockPath, branches: mockBranches });

		// Verify the result is processed correctly
		expect(result).toEqual([
			{
				branch: {
					name: 'branch-1',
					lastCommit: {
						sha: 'abc123',
						shortSha: 'abc123'.substring(0, 7),
						date: '2023-01-01',
						message: 'Initial commit',
						author: 'Test User',
						email: 'test@example.com'
					},
					current: false,
					fullyMerged: true,
					isRemote: false,
					isLocked: false
				},
				raw_output: 'Deleted branch feature/branch1'
			},
			{
				branch: {
					name: 'branch-2',
					lastCommit: {
						sha: 'def456',
						shortSha: 'def456'.substring(0, 7),
						date: '2023-01-02',
						message: 'Second commit',
						author: 'Test User',
						email: 'test@example.com'
					},
					current: false,
					fullyMerged: true,
					isRemote: false,
					isLocked: false
				},
				raw_output: 'Deleted branch feature/branch2'
			}
		]);
	});

	it('should handle invoke errors when mutation function is called', async () => {
		const mockError = new Error('Failed to delete branches');
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

		createDeleteBranchesMutation();

		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Using partial matching to be more flexible
		await expect(mutationFn({ path: mockPath, branches: mockBranches })).rejects.toMatchObject({
			message: 'Failed to delete branches'
		});
	});

	// Test for empty branches array (lines 30-35)
	it('should throw an error when no branches are selected', async () => {
		createDeleteBranchesMutation();

		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function with empty branches array
		await expect(mutationFn({ path: mockPath, branches: [] })).rejects.toMatchObject({
			message: 'No branches selected',
			kind: 'missing_branches',
			description: 'Please select at least one branch to delete'
		});

		// Verify that invoke was not called
		expect(invoke).not.toHaveBeenCalled();
	});

	// Test for Zod validation errors (lines 50-56)
	it('should handle Zod validation errors', async () => {
		createDeleteBranchesMutation();

		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Missing required 'path' property
		const invalidInput = { branches: mockBranches };

		// Simply check that it rejects and verify invoke wasn't called
		await expect(mutationFn(invalidInput as { branches: Branch[] })).rejects.toBeTruthy();

		// Verify that invoke was not called
		expect(invoke).not.toHaveBeenCalled();
	});

	// Test for Tauri errors (lines 60-61)
	it('should handle Tauri errors properly', async () => {
		// Setup a mock Tauri error with specific format
		const tauriError = {
			__TAURI_ERROR__: true,
			message: 'Git operation failed',
			stack: 'Error stack trace'
		};
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(tauriError);

		createDeleteBranchesMutation();

		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Using partial matching for just the message
		await expect(mutationFn({ path: mockPath, branches: mockBranches })).rejects.toMatchObject({
			message: 'Git operation failed'
		});
	});

	it('should pass custom options to createMutation', () => {
		const onSuccessMock = vi.fn();
		createDeleteBranchesMutation({ onSuccess: onSuccessMock });

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();

		// Check that our custom option is passed through
		expect(config.onSuccess).toBe(onSuccessMock);
	});
});
