import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDeleteBranchesMutation } from '../createDeleteBranchesMutation';
import type { Branch } from '$services/common';
import {
	testSetup,
	tauriMocks,
	testAssertions,
	errorMocks,
	mockDataFactory,
	type MockedInvoke
} from '$utils/test-utils';

// Mock the dependencies
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

describe('createDeleteBranchesMutation', () => {
	let mockedInvoke: MockedInvoke;
	const mockPath = '/path/to/repo';
	const mockBranches = [
		mockDataFactory.branch({ name: 'branch-1' }),
		mockDataFactory.branch({ name: 'branch-2' })
	];
	const mockMutationResult = {
		mutate: vi.fn(),
		mutateAsync: vi.fn()
	};

	beforeEach(() => {
		mockedInvoke = testSetup.setupInvokeMock(invoke);
		testSetup.setupBranchDeletionScenario(mockedInvoke, mockBranches);
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

		testAssertions.expectInvokeCalledWith(mockedInvoke, 'delete_branches', {
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

		// Verify the result structure is correct using the factory data
		expect(result).toEqual([
			mockDataFactory.deletedBranchInfo(mockBranches[0]),
			mockDataFactory.deletedBranchInfo(mockBranches[1])
		]);
	});

	it('should handle invoke errors when mutation function is called', async () => {
		const mockError = new Error('Failed to delete branches');
		tauriMocks.mockCommandFailure(mockedInvoke, 'delete_branches', mockError);

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

		// Verify that invoke was not called
		testAssertions.expectInvokeNotCalled(mockedInvoke);
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
		testAssertions.expectInvokeNotCalled(mockedInvoke);
	});

	// Test for Tauri errors (lines 60-61)
	it('should handle Tauri errors properly', async () => {
		tauriMocks.mockTauriError(mockedInvoke, 'delete_branches', 'Git operation failed');

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
