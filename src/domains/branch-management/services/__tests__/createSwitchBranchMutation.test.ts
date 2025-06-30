import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSwitchBranchMutation } from '../createSwitchBranchMutation';
import {
	testSetup,
	tauriMocks,
	testAssertions,
	errorMocks,
	type MockedInvoke
} from '$utils/test-utils';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('createSwitchBranchMutation', () => {
	let mockedInvoke: MockedInvoke;
	const mockPath = '/path/to/repo';
	const mockBranch = 'feature/new-branch';
	const mockSuccessResponse = 'Switched to branch feature/new-branch';

	// Mock the mutation result for svelte-query spying
	const mockMutationResult = {
		mutate: vi.fn(),
		mutateAsync: vi.fn(),
		reset: vi.fn(),
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
		mockedInvoke = testSetup.setupInvokeMock(invoke);
		tauriMocks.mockSwitchBranch(mockedInvoke, mockSuccessResponse);
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

		testAssertions.expectInvokeCalledWith(mockedInvoke, 'switch_branch', {
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
		await expect(mutationFn({ path: '', branch: mockBranch })).rejects.toMatchObject(
			errorMocks.missingPathMutationError()
		);
	});

	it('should handle invoke errors when mutation function is called', async () => {
		const mockError = new Error('Failed to switch branch');
		tauriMocks.mockCommandFailure(mockedInvoke, 'switch_branch', mockError);

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
