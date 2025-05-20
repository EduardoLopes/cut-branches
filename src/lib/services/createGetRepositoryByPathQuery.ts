import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { Repository } from '$lib/stores/repository.svelte';

// Define the expected Tauri error structure
interface TauriError {
	message: string;
	kind?: string;
	description?: string;
	[key: string]: unknown;
}

export function createGetRepositoryByPathQuery(
	path: () => string | undefined,
	options?: Omit<
		CreateQueryOptions<Repository, ServiceError, Repository, string[]>,
		'queryKey' | 'queryFn'
	>
) {
	return createQuery<Repository, ServiceError, Repository, string[]>(() => ({
		queryKey: ['branches', 'get-all', path() ?? ''],
		queryFn: async () => {
			try {
				const res = await invoke<string>('get_repo_info', { path: path() });
				const resParser = JSON.parse(res) as Repository;

				return resParser;
			} catch (error) {
				// Check if it's a structured error from Tauri
				if (typeof error === 'object' && error !== null) {
					const tauriError = error as TauriError;
					const serviceError: ServiceError = {
						message: tauriError.message || 'Failed to fetch repository data',
						kind: tauriError.kind || 'unknown_error',
						description: tauriError.description || 'An unexpected error occurred'
					};
					throw serviceError;
				}
				// If it's not a structured error, throw a generic one
				const serviceError: ServiceError = {
					message: 'Failed to fetch repository data',
					kind: 'unknown_error',
					description: String(error)
				};
				throw serviceError;
			}
		},
		enabled: !!path(),
		...options
	}));
}
