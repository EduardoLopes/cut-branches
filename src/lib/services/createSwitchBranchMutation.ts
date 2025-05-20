import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';

// Define the expected Tauri error structure
interface TauriError {
	message: string;
	kind?: string;
	description?: string;
	[key: string]: unknown;
}

type CreateSwitchbranchMutationOptions = CreateMutationOptions<
	string,
	ServiceError,
	{ path: string; branch: string },
	unknown
>;

export function createSwitchbranchMutation(options?: CreateSwitchbranchMutationOptions) {
	return createMutation(() => ({
		mutationKey: ['switch-branch'],
		mutationFn: async ({ path, branch }) => {
			if (!path) {
				const serviceError: ServiceError = {
					message: 'No path provided',
					kind: 'missing_path',
					description: 'A repository path is required to switch branches'
				};
				throw serviceError;
			}

			try {
				const res = await invoke<string>('switch_branch', { path, branch });
				return res;
			} catch (error) {
				// Check if it's a structured error from Tauri
				if (typeof error === 'object' && error !== null) {
					const tauriError = error as TauriError;
					const serviceError: ServiceError = {
						message: tauriError.message || 'Failed to switch branch',
						kind: tauriError.kind || 'unknown_error',
						description: tauriError.description || 'An unexpected error occurred'
					};
					throw serviceError;
				}
				// If it's not a structured error, throw a generic one
				const serviceError: ServiceError = {
					message: 'Failed to switch branch',
					kind: 'unknown_error',
					description: String(error)
				};
				throw serviceError;
			}
		},
		...options
	}));
}
