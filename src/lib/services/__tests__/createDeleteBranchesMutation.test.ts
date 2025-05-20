import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeleteBranchesMutation } from '../createDeleteBranchesMutation';
import type { Branch } from '$lib/stores/repository.svelte';

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
				hash: 'abc123',
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
				hash: 'def456',
				date: '2023-01-02',
				message: 'Commit 2',
				author: 'Test User',
				email: 'test@example.com'
			},
			fullyMerged: false
		}
	];
	const mockSuccessResponse = JSON.stringify([
		'Deleted branch feature/branch1',
		'Deleted branch feature/branch2'
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
		expect(result).toEqual(['Deleted branch feature/branch1', 'Deleted branch feature/branch2']);
	});

	it('should handle invoke errors when mutation function is called', async () => {
		const mockError = new Error('Failed to delete branches');
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

		createDeleteBranchesMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly and expect it to reject
		await expect(mutationFn({ path: mockPath, branches: mockBranches })).rejects.toEqual({
			message: 'Failed to delete branches',
			kind: 'unknown_error',
			description: 'An unexpected error occurred'
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
