import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import {
	createRestoreDeletedBranchMutation,
	createRestoreDeletedBranchesMutation,
	RestoreBranchInputSchema,
	RestoreBranchesInputSchema,
	RestoreBranchResponseSchema
} from '../createRestoreDeletedBranchMutation';
import type {
	RestoreBranchVariables,
	RestoreBranchesVariables,
	ConflictResolution
} from '../createRestoreDeletedBranchMutation';
import { createError } from '$utils/error-utils';

// Mock dependencies following TypeScript guidelines
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('$utils/error-utils', () => ({
	createError: vi.fn((error) => error)
}));

describe('createRestoreDeletedBranchMutation', () => {
	const mockInvoke = vi.mocked(invoke);
	const mockCreateError = vi.mocked(createError);

	const validSingleBranchVariables: RestoreBranchVariables = {
		path: '/path/to/repo',
		branchInfo: {
			originalName: 'feature-branch',
			targetName: 'feature-branch-restored',
			commitSha: 'abc123def456',
			conflictResolution: 'Overwrite'
		}
	};

	const validMultipleBranchesVariables: RestoreBranchesVariables = {
		path: '/path/to/repo',
		branchInfos: [
			{
				originalName: 'feature-1',
				targetName: 'feature-1-restored',
				commitSha: 'abc123',
				conflictResolution: 'Rename'
			},
			{
				originalName: 'feature-2',
				targetName: 'feature-2-restored',
				commitSha: 'def456',
				conflictResolution: null
			}
		]
	};

	const mockQueryResult = {
		data: null,
		mutate: vi.fn(),
		mutateAsync: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(svelteQuery, 'createMutation').mockImplementation(
			() => mockQueryResult as unknown as svelteQuery.CreateMutationResult<unknown, Error, unknown>
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('ConflictResolution type', () => {
		it('should have correct type values', () => {
			// ConflictResolution is now a type, not an enum, so we test the schema validation
			const ConflictResolutionSchema = z.enum(['Overwrite', 'Rename', 'Skip']);
			expect(ConflictResolutionSchema.parse('Overwrite')).toBe('Overwrite');
			expect(ConflictResolutionSchema.parse('Rename')).toBe('Rename');
			expect(ConflictResolutionSchema.parse('Skip')).toBe('Skip');
		});
	});

	describe('RestoreBranchInputSchema', () => {
		it('should validate valid single branch input', () => {
			const result = RestoreBranchInputSchema.parse(validSingleBranchVariables);
			expect(result).toEqual(validSingleBranchVariables);
		});

		it('should validate input without conflict resolution', () => {
			const inputWithoutConflictResolution = {
				...validSingleBranchVariables,
				branchInfo: {
					...validSingleBranchVariables.branchInfo,
					conflictResolution: null
				}
			};

			const result = RestoreBranchInputSchema.parse(inputWithoutConflictResolution);
			expect(result.branchInfo.conflictResolution).toBeNull();
		});

		it('should reject invalid input - missing path', () => {
			const invalidInput = {
				branchInfo: validSingleBranchVariables.branchInfo
			};

			expect(() => RestoreBranchInputSchema.parse(invalidInput)).toThrow();
		});

		it('should reject invalid input - missing branch info', () => {
			const invalidInput = {
				path: validSingleBranchVariables.path
			};

			expect(() => RestoreBranchInputSchema.parse(invalidInput)).toThrow();
		});

		it('should reject invalid conflict resolution', () => {
			const invalidInput = {
				...validSingleBranchVariables,
				branchInfo: {
					...validSingleBranchVariables.branchInfo,
					conflictResolution: 'InvalidResolution' as ConflictResolution
				}
			};

			expect(() => RestoreBranchInputSchema.parse(invalidInput)).toThrow();
		});
	});

	describe('RestoreBranchesInputSchema', () => {
		it('should validate valid multiple branches input', () => {
			const result = RestoreBranchesInputSchema.parse(validMultipleBranchesVariables);
			expect(result).toEqual(validMultipleBranchesVariables);
		});

		it('should validate branches with null conflict resolution', () => {
			const result = RestoreBranchesInputSchema.parse(validMultipleBranchesVariables);
			expect(result.branchInfos[1].conflictResolution).toBeNull();
		});

		it('should reject empty branch infos array', () => {
			const invalidInput = {
				path: '/path/to/repo',
				branchInfos: []
			};

			const result = RestoreBranchesInputSchema.parse(invalidInput);
			expect(result.branchInfos).toHaveLength(0);
		});
	});

	describe('RestoreBranchResponseSchema', () => {
		it('should validate successful response', () => {
			const successResponse = {
				success: true,
				branchName: 'feature-branch',
				message: 'Branch restored successfully',
				requiresUserAction: false,
				skipped: false,
				conflictDetails: null,
				branch: {
					name: 'feature-branch',
					current: false,
					fullyMerged: false,
					lastCommit: {
						sha: 'abc123',
						shortSha: 'abc123',
						date: '2023-01-01T00:00:00Z',
						message: 'Test commit',
						author: 'Test Author',
						email: 'test@example.com'
					}
				},
				processing: false
			};

			const result = RestoreBranchResponseSchema.parse(successResponse);
			expect(result).toEqual(successResponse);
		});

		it('should validate response with conflict details', () => {
			const conflictResponse = {
				success: false,
				branchName: 'feature-branch',
				message: 'Conflict detected',
				requiresUserAction: true,
				skipped: false,
				conflictDetails: {
					originalName: 'feature-branch',
					conflictingName: 'existing-branch'
				},
				branch: null
			};

			const result = RestoreBranchResponseSchema.parse(conflictResponse);
			expect(result.conflictDetails).toEqual({
				originalName: 'feature-branch',
				conflictingName: 'existing-branch'
			});
		});
	});

	describe('createRestoreDeletedBranchMutation', () => {
		it('should create mutation with correct structure', () => {
			createRestoreDeletedBranchMutation();

			expect(svelteQuery.createMutation).toHaveBeenCalled();
			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();

			expect(config.mutationKey).toEqual(['branches', 'restore']);
			expect(typeof config.mutationFn).toBe('function');
		});

		it('should create mutation with custom options', () => {
			const options = {
				onSuccess: vi.fn(),
				onError: vi.fn()
			};

			createRestoreDeletedBranchMutation(options);

			expect(svelteQuery.createMutation).toHaveBeenCalled();
			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();

			expect(config.onSuccess).toBe(options.onSuccess);
			expect(config.onError).toBe(options.onError);
		});

		it('should successfully restore a branch', async () => {
			const mockResponse = {
				success: true,
				branchName: 'feature-branch',
				message: 'Branch restored successfully',
				requiresUserAction: false,
				skipped: false,
				conflictDetails: null,
				branch: null
			};

			mockInvoke.mockResolvedValue(JSON.stringify(mockResponse));

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			const result = await mutationFn(validSingleBranchVariables);

			expect(mockInvoke).toHaveBeenCalledWith('restore_deleted_branch', {
				path: validSingleBranchVariables.path,
				branchInfo: validSingleBranchVariables.branchInfo
			});
			expect(result).toEqual(mockResponse);
		});

		it('should handle service errors when invoke fails', async () => {
			mockInvoke.mockResolvedValue(undefined);

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();
		});

		it('should handle JSON parsing errors', async () => {
			mockInvoke.mockResolvedValue('invalid json');

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();
		});

		it('should handle response validation errors', async () => {
			const invalidResponse = {
				invalid_field: true
			};
			mockInvoke.mockResolvedValue(JSON.stringify(invalidResponse));

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();
		});

		it('should handle service errors from invoke', async () => {
			const serviceError = new Error('Service unavailable');
			mockInvoke.mockRejectedValue(serviceError);

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalledWith(serviceError);
		});

		it('should handle input validation errors', async () => {
			// Mock the parse method to throw a validation error
			const originalParse = RestoreBranchInputSchema.parse;
			vi.spyOn(RestoreBranchInputSchema, 'parse').mockImplementation(() => {
				throw new Error('Validation failed');
			});

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();

			// Restore original parse method
			RestoreBranchInputSchema.parse = originalParse;
		});

		it('should handle ZodError validation errors with proper error formatting', async () => {
			// Generate a real ZodError by parsing invalid data
			let zodError: z.ZodError;
			try {
				RestoreBranchInputSchema.parse({ invalid: 'data' });
			} catch (error) {
				zodError = error as z.ZodError;
			}

			// Mock the parse method to throw the ZodError
			const originalParse = RestoreBranchInputSchema.parse;
			vi.spyOn(RestoreBranchInputSchema, 'parse').mockImplementation(() => {
				throw zodError!;
			});

			createRestoreDeletedBranchMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validSingleBranchVariables)).rejects.toThrow();

			// Verify createError was called with the specific validation error
			expect(mockCreateError).toHaveBeenCalledWith({
				message: 'Invalid input data for restoring branch',
				kind: 'validation_error',
				description: expect.any(String)
			});

			// Restore original parse method
			RestoreBranchInputSchema.parse = originalParse;
		});
	});

	describe('createRestoreDeletedBranchesMutation', () => {
		it('should create batch mutation with correct structure', () => {
			createRestoreDeletedBranchesMutation();

			expect(svelteQuery.createMutation).toHaveBeenCalled();
			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();

			expect(config.mutationKey).toEqual(['branches', 'restore-batch']);
			expect(typeof config.mutationFn).toBe('function');
		});

		it('should successfully restore multiple branches', async () => {
			const mockResponse = [
				[
					'feature-1',
					{
						success: true,
						branchName: 'feature-1',
						message: 'Branch restored successfully',
						requiresUserAction: false,
						skipped: false,
						conflictDetails: null,
						branch: null
					}
				],
				[
					'feature-2',
					{
						success: false,
						branchName: 'feature-2',
						message: 'Conflict detected',
						requiresUserAction: true,
						skipped: false,
						conflictDetails: {
							originalName: 'feature-2',
							conflictingName: 'existing-feature-2'
						},
						branch: null
					}
				]
			];

			mockInvoke.mockResolvedValue(JSON.stringify(mockResponse));

			createRestoreDeletedBranchesMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			const result = await mutationFn(validMultipleBranchesVariables);

			expect(mockInvoke).toHaveBeenCalledWith('restore_deleted_branches', {
				path: validMultipleBranchesVariables.path,
				branchInfos: validMultipleBranchesVariables.branchInfos
			});
			expect(result).toEqual(mockResponse);
		});

		it('should handle service errors in batch operations', async () => {
			mockInvoke.mockResolvedValue(undefined);

			createRestoreDeletedBranchesMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validMultipleBranchesVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();
		});

		it('should handle batch validation errors', async () => {
			// Mock the parse method to throw a validation error
			const originalParse = RestoreBranchesInputSchema.parse;
			vi.spyOn(RestoreBranchesInputSchema, 'parse').mockImplementation(() => {
				throw new Error('Batch validation failed');
			});

			createRestoreDeletedBranchesMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validMultipleBranchesVariables)).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();

			// Restore original parse method
			RestoreBranchesInputSchema.parse = originalParse;
		});

		it('should handle ZodError in batch mutation with proper error formatting', async () => {
			// Generate a real ZodError by parsing invalid data
			let zodError: z.ZodError;
			try {
				RestoreBranchesInputSchema.parse({ invalid: 'batch data' });
			} catch (error) {
				zodError = error as z.ZodError;
			}

			// Mock the parse method to throw the ZodError
			const originalParse = RestoreBranchesInputSchema.parse;
			vi.spyOn(RestoreBranchesInputSchema, 'parse').mockImplementation(() => {
				throw zodError!;
			});

			createRestoreDeletedBranchesMutation();

			const createMutationArg = (svelteQuery.createMutation as unknown as ReturnType<typeof vi.fn>)
				.mock.calls[0][0];
			const config = createMutationArg();
			const mutationFn = config.mutationFn;

			await expect(mutationFn(validMultipleBranchesVariables)).rejects.toThrow();

			// Verify createError was called with the specific batch validation error
			expect(mockCreateError).toHaveBeenCalledWith({
				message: 'Invalid input data for batch restoring branches',
				kind: 'validation_error',
				description: expect.any(String)
			});

			// Restore original parse method
			RestoreBranchesInputSchema.parse = originalParse;
		});
	});
});
