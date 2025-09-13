import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { commands, type ConflictResolution } from '$lib/bindings';
import { BranchSchema } from '$services/common';
import { createError, type AppError } from '$utils/error-utils';

// ConflictResolution schema that matches the generated type
const ConflictResolutionSchema = z.enum(['Overwrite', 'Rename', 'Skip']);

// Re-export the ConflictResolution type from bindings for convenience
export type { ConflictResolution };

// Input schema for branch restoration
export const RestoreBranchInputSchema = z.object({
	path: z.string(),
	branchInfo: z.object({
		originalName: z.string(),
		targetName: z.string(),
		commitSha: z.string(),
		conflictResolution: ConflictResolutionSchema.nullable()
	})
});

export type RestoreBranchVariables = z.infer<typeof RestoreBranchInputSchema>;

// Input schema for batch branch restoration
export const RestoreBranchesInputSchema = z.object({
	path: z.string(),
	branchInfos: z.array(
		z.object({
			originalName: z.string(),
			targetName: z.string(),
			commitSha: z.string(),
			conflictResolution: ConflictResolutionSchema.nullable()
		})
	)
});

export type RestoreBranchesVariables = z.infer<typeof RestoreBranchesInputSchema>;

// Response schema for branch restoration
export const RestoreBranchResponseSchema = z.object({
	success: z.boolean(),
	branchName: z.string(),
	message: z.string(),
	requiresUserAction: z.boolean(),
	skipped: z.boolean(),
	conflictDetails: z
		.object({
			originalName: z.string(),
			conflictingName: z.string()
		})
		.optional()
		.nullable(),
	branch: BranchSchema.optional().nullable(),
	processing: z.boolean().optional()
});

export type RestoreBranchResult = z.infer<typeof RestoreBranchResponseSchema>;

// Response schema for batch restoration
export const RestoreBranchesResponseSchema = z.array(RestoreBranchResponseSchema);

export type RestoreBranchesResult = z.infer<typeof RestoreBranchesResponseSchema>;

type RestoreBranchMutationOptions = CreateMutationOptions<
	RestoreBranchResult,
	AppError,
	RestoreBranchVariables,
	unknown
>;

type RestoreBranchesMutationOptions = CreateMutationOptions<
	RestoreBranchesResult,
	AppError,
	RestoreBranchesVariables,
	unknown
>;

export function createRestoreDeletedBranchMutation(options?: RestoreBranchMutationOptions) {
	return createMutation<RestoreBranchResult, AppError, RestoreBranchVariables>(() => ({
		mutationKey: ['branches', 'restore'],
		mutationFn: async (vars) => {
			try {
				// Validate input
				const validatedInput = RestoreBranchInputSchema.parse(vars);

				// Call Tauri command using generated bindings
				const result = await commands.restoreDeletedBranch(
					validatedInput.path,
					validatedInput.branchInfo
				);

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to restore branch',
						kind: result.error.kind || 'tauri_error',
						description: result.error.description || null
					});
				}

				// Parse and validate response
				const validatedResponse = await RestoreBranchResponseSchema.parseAsync(result.data);

				return validatedResponse;
			} catch (error) {
				// Handle specific validation errors

				if (error instanceof z.ZodError) {
					const errorMessage = z
						.treeifyError(error)
						.errors.map((e) => e)
						.join('; ');

					throw createError({
						message: 'Invalid input data for restoring branch',
						kind: 'validation_error',
						description: errorMessage
					});
				}

				// Handle service errors that we explicitly threw
				throw createError(error);
			}
		},
		...options
	}));
}

export function createRestoreDeletedBranchesMutation(options?: RestoreBranchesMutationOptions) {
	return createMutation<RestoreBranchesResult, AppError, RestoreBranchesVariables>(() => ({
		mutationKey: ['branches', 'restore-batch'],
		mutationFn: async (vars) => {
			try {
				// Validate input
				const validatedInput = RestoreBranchesInputSchema.parse(vars);

				// Call Tauri command using generated bindings
				const result = await commands.restoreDeletedBranches(
					validatedInput.path,
					validatedInput.branchInfos
				);

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to restore branches',
						kind: result.error.kind || 'tauri_error',
						description: result.error.description || null
					});
				}

				// Parse and validate response
				const validatedResponse = await RestoreBranchesResponseSchema.parseAsync(result.data);

				return validatedResponse;
			} catch (error) {
				// Handle specific validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = z
						.treeifyError(error)
						.errors.map((e) => e)
						.join('; ');

					throw createError({
						message: error.message || 'Invalid input data for batch restoring branches',
						kind: error.type || 'validation_error',
						description: errorMessage
					});
				}

				// Handle service errors that we explicitly threw
				throw createError(error);
			}
		},
		...options
	}));
}
