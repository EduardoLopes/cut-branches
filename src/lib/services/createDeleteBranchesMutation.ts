import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { Branch } from '$lib/stores/repository.svelte';

// Define the expected Tauri error structure
interface TauriError {
	message: string;
	kind?: string;
	description?: string;
	[key: string]: unknown;
}

interface DeleteBranchesVariables {
	branches: Branch[];
	path: string;
}

type DeleteBranchesMutationOptions = CreateMutationOptions<
	string[],
	ServiceError,
	DeleteBranchesVariables,
	unknown
>;

export function createDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<string[], ServiceError, DeleteBranchesVariables>(() => ({
		mutationKey: ['branches', 'delete'],
		mutationFn: async (vars) => {
			if (!vars.path) {
				throw {
					message: 'No path provided',
					kind: 'missing_path',
					description: 'A repository path is required to delete branches'
				} as ServiceError;
			}

			if (!vars.branches || vars.branches.length === 0) {
				throw {
					message: 'No branches selected',
					kind: 'missing_branches',
					description: 'Please select at least one branch to delete'
				} as ServiceError;
			}

			try {
				const res = await invoke<string>('delete_branches', {
					path: vars.path,
					branches: vars.branches.map((item) => item.name)
				});
				const resParser = JSON.parse(res) as string[];
				return resParser.map((item: string) => item.trim());
			} catch (error) {
				// Check if it's a structured error from Tauri
				if (typeof error === 'object' && error !== null) {
					const tauriError = error as TauriError;
					throw {
						message: tauriError.message || 'Failed to delete branches',
						kind: tauriError.kind || 'unknown_error',
						description: tauriError.description || 'An unexpected error occurred'
					} as ServiceError;
				}
				// If it's not a structured error, throw a generic one
				throw {
					message: 'Failed to delete branches',
					kind: 'unknown_error',
					description: String(error)
				} as ServiceError;
			}
		},
		...options
	}));
}
