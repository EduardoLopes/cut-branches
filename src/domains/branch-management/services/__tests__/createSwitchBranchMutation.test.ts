import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSwitchBranchMutation } from '../createSwitchBranchMutation';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('createSwitchBranchMutation', () => {
	const mockPath = '/path/to/repo';
	const mockBranch = 'feature/new-branch';
	const mockSuccessResponse = 'Switched to branch feature/new-branch';

	// Define a mock mutation result with required properties
	const mockMutate = vi.fn();
	const mockMutateAsync = vi.fn();
	const mockReset = vi.fn();

	// Mock the mutation result
	const mockMutationResult = {
		mutate: mockMutate,
		mutateAsync: mockMutateAsync,
		reset: mockReset,
		data: undefined,
		error: null,
		isPending: false,
		isError: false,
		isSuccess: true,
		status: 'success',
		variables: undefined,
		context: undefined
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Setup the default success response
		(invoke as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(mockSuccessResponse);
		// Mock createMutation to return our mock result
		// @ts-expect-error - Mock implementation for testing
		vi.spyOn(svelteQuery, 'createMutation').mockImplementation(() => mockMutationResult);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should create a mutation with the correct configuration', () => {
		createSwitchBranchMutation();

		expect(svelteQuery.createMutation).toHaveBeenCalled();
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();

		expect(config.mutationKey).toEqual(['switch-branch']);
		expect(typeof config.mutationFn).toBe('function');
	});

	it('should call invoke with correct parameters when mutation function is called', async () => {
		createSwitchBranchMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly
		await mutationFn({ path: mockPath, branch: mockBranch });

		expect(invoke).toHaveBeenCalledWith('switch_branch', {
			path: mockPath,
			branch: mockBranch
		});
	});

	it('should return the response from invoke when mutation function is called', async () => {
		createSwitchBranchMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly
		const result = await mutationFn({ path: mockPath, branch: mockBranch });

		expect(result).toBe(mockSuccessResponse);
	});

	it('should reject if no path is provided when mutation function is called', async () => {
		createSwitchBranchMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Call the mutation function directly with empty path
		await expect(mutationFn({ path: '', branch: mockBranch })).rejects.toEqual({
			message: 'No path provided',
			kind: 'missing_path',
			description: 'A repository path is required to switch branches'
		});
	});

	it('should handle invoke errors when mutation function is called', async () => {
		const mockError = new Error('Failed to switch branch');
		(invoke as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(mockError);

		createSwitchBranchMutation();

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();
		const mutationFn = config.mutationFn;

		// Using partial matching for just the message
		await expect(mutationFn({ path: mockPath, branch: mockBranch })).rejects.toMatchObject({
			message: 'Failed to switch branch'
		});
	});

	it('should pass custom options to createMutation', () => {
		const onSuccessMock = vi.fn();
		createSwitchBranchMutation({ onSuccess: onSuccessMock });

		// Get the mutation function from the createMutation call
		const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
			.mock.calls[0][0];
		const config = createMutationArg();

		// Check that our custom option is passed through
		expect(config.onSuccess).toBe(onSuccessMock);
	});
});
