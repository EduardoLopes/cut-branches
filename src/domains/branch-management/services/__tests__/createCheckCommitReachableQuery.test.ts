import * as svelteQuery from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
	createCheckCommitReachableQuery,
	CommitReachableInputSchema
} from '../createCheckCommitReachableQuery';
import { createError } from '$utils/error-utils';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

// Mock error utils
vi.mock('$utils/error-utils', () => ({
	createError: vi.fn((error) => error)
}));

describe('createCheckCommitReachableQuery', () => {
	const mockInvoke = vi.mocked(invoke);
	const mockCreateError = vi.mocked(createError);

	const validVariables = {
		path: '/path/to/repo',
		commitSha: 'abc123def456'
	};

	const mockQueryResult = {
		data: true,
		refetch: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
		// Mock createQuery to return our mock query result
		vi.spyOn(svelteQuery, 'createQuery').mockImplementation(
			() => mockQueryResult as unknown as svelteQuery.CreateQueryResult<boolean, Error>
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('CommitReachableInputSchema', () => {
		it('should validate valid input', () => {
			const result = CommitReachableInputSchema.parse(validVariables);
			expect(result).toEqual(validVariables);
		});

		it('should reject invalid input - missing path', () => {
			expect(() => {
				CommitReachableInputSchema.parse({ commitSha: 'abc123' });
			}).toThrow();
		});

		it('should reject invalid input - missing commitSha', () => {
			expect(() => {
				CommitReachableInputSchema.parse({ path: '/path' });
			}).toThrow();
		});

		it('should accept empty strings as valid input', () => {
			const result = CommitReachableInputSchema.parse({ path: '', commitSha: '' });
			expect(result).toEqual({ path: '', commitSha: '' });
		});
	});

	describe('createCheckCommitReachableQuery', () => {
		it('should create query with correct structure', () => {
			createCheckCommitReachableQuery(validVariables);

			expect(svelteQuery.createQuery).toHaveBeenCalled();
			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();

			expect(config.queryKey).toEqual(['commit', 'reachable', validVariables.commitSha]);
			expect(typeof config.queryFn).toBe('function');
		});

		it('should create query with custom options', () => {
			createCheckCommitReachableQuery(validVariables);

			expect(svelteQuery.createQuery).toHaveBeenCalled();
		});

		it('should return true when commit is reachable', async () => {
			const mockResponse = { isReachable: true };
			mockInvoke.mockResolvedValue(mockResponse);

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			const result = await queryFn();

			expect(mockInvoke).toHaveBeenCalledWith('is_commit_reachable', {
				input: validVariables
			});
			expect(result).toBe(true);
		});

		it('should return false when commit is not reachable', async () => {
			const mockResponse = { isReachable: false };
			mockInvoke.mockResolvedValue(mockResponse);

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			const result = await queryFn();

			expect(result).toBe(false);
		});

		it('should handle service errors when invoke fails', async () => {
			mockInvoke.mockResolvedValue(undefined);

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			await expect(queryFn()).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();
		});

		it('should handle JSON parsing errors', async () => {
			mockInvoke.mockResolvedValue('invalid json');

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			await expect(queryFn()).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalled();
		});

		it('should handle response validation errors', async () => {
			const mockResponse = { invalid_field: true };
			mockInvoke.mockResolvedValue(mockResponse);

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			await expect(queryFn()).rejects.toThrow();
		});

		it('should handle service errors from invoke', async () => {
			const serviceError = new Error('Service unavailable');
			mockInvoke.mockRejectedValue(serviceError);

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			await expect(queryFn()).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalledWith(serviceError);
		});

		it('should handle ZodError with multiple validation errors', async () => {
			// Generate a real ZodError by parsing invalid data
			let zodError: z.ZodError;
			try {
				CommitReachableInputSchema.parse({ path: 123, commitSha: '' });
			} catch (error) {
				zodError = error as z.ZodError;
			}

			// Mock the parse method to throw the ZodError
			const originalParse = CommitReachableInputSchema.parse;
			vi.spyOn(CommitReachableInputSchema, 'parse').mockImplementation(() => {
				throw zodError;
			});

			createCheckCommitReachableQuery(validVariables);

			const createQueryArg = (svelteQuery.createQuery as unknown as ReturnType<typeof vi.fn>).mock
				.calls[0][0];
			const config = createQueryArg();
			const queryFn = config.queryFn;

			await expect(queryFn()).rejects.toThrow();
			expect(mockCreateError).toHaveBeenCalledWith({
				message: 'Invalid input data for checking commit reachability',
				kind: 'validation_error',
				description: expect.stringContaining('expected string, received number')
			});

			// Restore original parse method
			CommitReachableInputSchema.parse = originalParse;
		});
	});
});
