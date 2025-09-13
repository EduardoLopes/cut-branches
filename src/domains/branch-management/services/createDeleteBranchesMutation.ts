import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { commands, type DeletedBranchInfo } from '$lib/bindings';
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
	rawOutput: z.string()
});

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

				const result = await commands.deleteBranches({
					path: validatedInput.path,
					branches: validatedInput.branches.map((item) => item.name)
				});

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to delete branches',
						kind: result.error.kind || 'tauri_error',
						description: result.error.description || null
					});
				}

				// Parse and validate response
				const validatedResponse = await DeleteBranchesResponseSchema.parseAsync(
					result.data.deletedBranches
				);

				return validatedResponse;
			} catch (error) {
				// Handle service errors that we explicitly threw
				throw createError(error);
			}
		},
		...options
	}));
}
