import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { type SwitchBranchVariables, SwitchBranchInputSchema } from './common';
import { createError } from '$lib/utils/error-utils';

type CreateSwitchbranchMutationOptions = CreateMutationOptions<
	string,
	ServiceError,
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

				const res = await invoke<string>('switch_branch', {
					path: validatedInput.path,
					branch: validatedInput.branch
				});
				return res;
			} catch (error) {
				// Handle validation errors
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
