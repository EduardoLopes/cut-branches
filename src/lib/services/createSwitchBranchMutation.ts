import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import {
	type ServiceError,
	type SwitchBranchVariables,
	SwitchBranchInputSchema,
	handleTauriError
} from './common';

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
					throw {
						message: 'No path provided',
						kind: 'missing_path',
						description: 'A repository path is required to switch branches'
					} as ServiceError;
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
