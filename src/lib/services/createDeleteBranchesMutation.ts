import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { type DeleteBranchesVariables, DeleteBranchesInputSchema } from './common';
import { createError } from '$lib/utils/error-utils';

type DeleteBranchesMutationOptions = CreateMutationOptions<
	string[],
	ServiceError,
	DeleteBranchesVariables,
	unknown
>;

// Response schema for delete branches
const DeleteBranchesResponseSchema = z.array(z.string());

export function createDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<string[], ServiceError, DeleteBranchesVariables>(() => ({
		mutationKey: ['branches', 'delete'],
		mutationFn: async (vars) => {
			try {
				// Validate input
				const validatedInput = DeleteBranchesInputSchema.parse(vars);

				if (validatedInput.branches.length === 0) {
					throw createError({
						message: 'No branches selected',
						kind: 'missing_branches',
						description: 'Please select at least one branch to delete'
					});
				}

				const res = await invoke<string>('delete_branches', {
					path: validatedInput.path,
					branches: validatedInput.branches.map((item) => item.name)
				});

				// Validate response
				const parsedResponse = JSON.parse(res);
				const validatedResponse = DeleteBranchesResponseSchema.parse(parsedResponse);

				return validatedResponse.map((item) => item.trim());
			} catch (error) {
				// Handle specific validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = error.errors.map((e) => e.message).join('; ');
					throw createError({
						message: 'Invalid input data',
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
