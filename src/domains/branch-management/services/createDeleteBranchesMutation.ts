import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod/v4';
import {
	type DeleteBranchesVariables,
	BranchSchema,
	DeleteBranchesInputSchema
} from '$services/common';
import { createError, type AppError } from '$utils/error-utils';

type DeleteBranchesMutationOptions = CreateMutationOptions<
	DeletedBranchInfo[],
	AppError,
	DeleteBranchesVariables,
	unknown
>;

// Response schema for delete branches
const DeletedBranchInfoSchema = z.object({
	branch: BranchSchema,
	raw_output: z.string()
});

type DeletedBranchInfo = z.infer<typeof DeletedBranchInfoSchema>;

const DeleteBranchesResponseSchema = z.array(DeletedBranchInfoSchema);

export function createDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<DeletedBranchInfo[], AppError, DeleteBranchesVariables>(() => ({
		mutationKey: ['branches', 'delete'],
		mutationFn: async (vars) => {
			try {
				// Validate input
				const validatedInput = await DeleteBranchesInputSchema.parseAsync(vars);

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

				const validatedResponse = await DeleteBranchesResponseSchema.parseAsync(parsedResponse);

				return validatedResponse;
			} catch (error) {
				// Handle service errors that we explicitly threw
				throw createError(error);
			}
		},
		...options
	}));
}
