import * as svelteQuery from '@tanstack/svelte-query';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeleteBranchesMutation } from '../createDeleteBranchesMutation';
import { commands } from '$lib/bindings';
import type { Branch } from '$services/common';
import { errorMocks, mockDataFactory } from '$utils/test-utils';

// Mock the generated bindings
vi.mock('$lib/bindings', () => ({
	commands: {
		deleteBranches: vi.fn()
	}
}));

describe('createDeleteBranchesMutation', () => {
	const mockedDeleteBranches = vi.mocked(commands.deleteBranches);
	const mockPath = '/path/to/repo';
	const mockBranches = [
		mockDataFactory.branch({ name: 'branch-1' }),
		mockDataFactory.branch({ name: 'branch-2' })
	];
	const mockMutationResult = {
		mutate: vi.fn(),
		mutateAsync: vi.fn()
	};

	const mockDeletedBranches = [
		{
			branch: mockDataFactory.branch({ name: 'branch-1' }),
			raw_output: 'Deleted branch branch-1 (was a1b2c3d).'
		},
		{
			branch: mockDataFactory.branch({ name: 'branch-2' }),
			raw_output: 'Deleted branch branch-2 (was e4f5g6h).'
		}
	];

	beforeEach(() => {
		// Set up mock for successful deletion
		mockedDeleteBranches.mockResolvedValue({
			status: 'ok',
			data: JSON.stringify(mockDeletedBranches)
		});

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

	it('should call deleteBranches command with correct parameters when mutation function is called', async () => {
		createDeleteBranchesMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly
		await mutationFn({ path: mockPath, branches: mockBranches });

		expect(mockedDeleteBranches).toHaveBeenCalledWith(
			mockPath,
			mockBranches.map((item) => item.name)
		);
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

		// Verify the result structure is correct
		expect(result).toEqual(mockDeletedBranches);
	});

	it('should handle command errors when mutation function is called', async () => {
		const mockError = new Error('Failed to delete branches');
		mockedDeleteBranches.mockRejectedValue(mockError);

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
		await expect(mutationFn({ path: mockPath, branches: [] })).rejects.toMatchObject(
			errorMocks.missingBranchesError()
		);

		// Verify that deleteBranches command was not called
		expect(mockedDeleteBranches).not.toHaveBeenCalled();
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

		// Verify that deleteBranches command was not called
		expect(mockedDeleteBranches).not.toHaveBeenCalled();
	});

	// Test for Tauri errors (lines 60-61)
	it('should handle Tauri errors properly', async () => {
		// Mock the command to return an error result
		mockedDeleteBranches.mockResolvedValue({
			status: 'error',
			error: {
				message: 'Git operation failed',
				kind: 'git_error',
				description: null
			}
		});

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
