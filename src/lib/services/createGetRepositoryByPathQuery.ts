import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import { z } from 'zod';
import { type ServiceError, type Repository, RepositorySchema, handleTauriError } from './common';

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
				// Validate path
				const currentPath = path();
				if (!currentPath) {
					throw {
						message: 'No path provided',
						kind: 'missing_path',
						description: 'A repository path is required to fetch repository data'
					} as ServiceError;
				}

				const res = await invoke<string>('get_repo_info', { path: currentPath });

				// Validate response
				const parsedResponse = JSON.parse(res);
				const parsedData = RepositorySchema.parse(parsedResponse);

				// Process branches to ensure valid dates
				const processedBranches = parsedData.branches.map((branch) => {
					// If lastCommit.date is empty or invalid, use current date
					if (!branch.lastCommit?.date) {
						return {
							...branch,
							lastCommit: {
								...(branch.lastCommit ?? {}),
								date: new Date().toISOString()
							}
						};
					}

					// Validate date string - if invalid, replace with current date
					try {
						// Test if date is valid by attempting to create a Date object
						new Date(branch.lastCommit.date).toISOString();
						return branch;
					} catch {
						return {
							...branch,
							lastCommit: {
								...(branch.lastCommit ?? {}),
								date: new Date().toISOString()
							}
						};
					}
				});

				// Create the repository with processed branches and branch count
				const repository: Repository = {
					...parsedData,
					branches: processedBranches,
					branchesCount: parsedData.branches.length
				};

				return repository;
			} catch (error) {
				// Handle validation errors
				if (error instanceof z.ZodError) {
					const errorMessage = error.errors.map((e) => e.message).join('; ');
					throw {
						message: 'Invalid repository data',
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
		enabled: !!path(),
		...options
	}));
}
