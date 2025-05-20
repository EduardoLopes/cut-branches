import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import {
	type ServiceError,
	type DeleteBranchesVariables,
	DeleteBranchesInputSchema,
	handleTauriError
} from './common';

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
					throw {
						message: 'No branches selected',
						kind: 'missing_branches',
						description: 'Please select at least one branch to delete'
					} as ServiceError;
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
					throw {
						message: 'Invalid input data',
						kind: 'validation_error',
						description: errorMessage
					} as ServiceError;
				}

				// Handle service errors that we explicitly threw
				if (typeof error === 'object' && error !== null && 'kind' in error) {
					throw error as ServiceError;
				}

				// Handle Tauri errors
				throw handleTauriError(error);
			}
		},
		...options
	}));
}
