import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod/v4';
import { createError, type AppError } from '$lib/utils/error-utils';

export enum ConflictResolution {
	Overwrite = 'Overwrite',
	Rename = 'Rename',
	Skip = 'Skip'
}

// Input schema for branch restoration
export const RestoreBranchInputSchema = z.object({
	path: z.string(),
	branchInfo: z.object({
		originalName: z.string(),
		targetName: z.string(),
		commitSha: z.string(),
		conflictResolution: z.nativeEnum(ConflictResolution).optional()
	})
});

export type RestoreBranchVariables = z.infer<typeof RestoreBranchInputSchema>;

// Response schema for branch restoration
export const RestoreBranchResponseSchema = z.object({
	success: z.boolean(),
	branchName: z.string(),
	message: z.string(),
	requiresUserAction: z.boolean(),
	skipped: z.boolean(),
	conflictDetails: z
		.object({
			originalName: z.string().optional(),
			conflictingName: z.string().optional()
		})
		.optional()
		.nullable()
});

export type RestoreBranchResult = z.infer<typeof RestoreBranchResponseSchema>;

type RestoreBranchMutationOptions = CreateMutationOptions<
	RestoreBranchResult,
	AppError,
	RestoreBranchVariables,
	unknown
>;

export function createRestoreDeletedBranchMutation(options?: RestoreBranchMutationOptions) {
	return createMutation<RestoreBranchResult, AppError, RestoreBranchVariables>(() => ({
		mutationKey: ['branches', 'restore'],
		mutationFn: async (vars) => {
			try {
				// Validate input
				const validatedInput = RestoreBranchInputSchema.parse(vars);

				// Call Tauri command
				const res = await invoke<string>('restore_deleted_branch', {
					path: validatedInput.path,
					branchInfo: validatedInput.branchInfo
				});

				// Parse and validate response
				const parsedResponse = JSON.parse(res);
				console.log({ parsedResponse });
				const validatedResponse = await RestoreBranchResponseSchema.parseAsync(parsedResponse);

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
