import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { z } from 'zod';
import { commands } from '$lib/bindings';
import { type SwitchBranchVariables, SwitchBranchInputSchema } from '$services/common';
import { createError, type AppError } from '$utils/error-utils';

type CreateSwitchbranchMutationOptions = CreateMutationOptions<
	string,
	AppError,
	SwitchBranchVariables,
	unknown
>;

export function createSwitchBranchMutation(options?: CreateSwitchbranchMutationOptions) {
	return createMutation(() => ({
		mutationKey: ['switch-branch'],
		mutationFn: async (vars) => {
			try {
				// Check for empty path first (to match test expectations)
				if (!vars.path) {
					throw createError({
						message: 'No path provided',
						kind: 'missing_path',
						description: 'A repository path is required to switch branches'
					});
				}

				// Validate input
				const validatedInput = SwitchBranchInputSchema.parse(vars);

				// Call Tauri command using generated bindings
				const result = await commands.switchBranch(validatedInput.path, validatedInput.branch);

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to switch branch',
						kind: result.error.kind || 'tauri_error',
						description: result.error.description || null
					});
				}

				return result.data;
			} catch (error) {
				// Handle validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = error.issues.map((e) => e.message).join('; ');
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
