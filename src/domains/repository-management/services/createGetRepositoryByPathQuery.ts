import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { z } from 'zod/v4';
import { commands } from '$lib/bindings';
import { RepositorySchema, type Repository } from '$services/common';
import { createError, type AppError } from '$utils/error-utils';
import { isValidDate } from '$utils/validation-utils';

export function createGetRepositoryByPathQuery(
	path: () => string | undefined,
	options?: Omit<
		CreateQueryOptions<Repository, AppError, Repository, string[]>,
		'queryKey' | 'queryFn'
	>
) {
	return createQuery<Repository, AppError, Repository, string[]>(() => ({
		queryKey: ['branches', 'get-all', path() ?? ''],
		queryFn: async () => {
			try {
				// Validate path
				const currentPath = path();
				if (!currentPath) {
					throw createError({
						message: 'No path provided',
						kind: 'missing_path',
						description: 'A repository path is required to fetch repository data'
					});
				}

				const result = await commands.getRepository({ path: currentPath });

				if (result.status === 'error') {
					throw createError({
						message: result.error.message || 'Failed to get repository information',
						kind: 'tauri_error',
						description: result.error.description || null
					});
				}

				// Validate response
				const parsedData = RepositorySchema.parse(result.data);

				// Process branches to ensure valid dates
				const processedBranches = parsedData.branches.map((branch) => {
					// If lastCommit.date is empty or invalid, use current date
					if (!branch.lastCommit?.date || !isValidDate(branch.lastCommit.date)) {
						return {
							...branch,
							lastCommit: {
								...(branch.lastCommit ?? {}),
								date: new Date().toISOString()
							}
						};
					}

					return branch;
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
					const errorMessage = error.issues
						.map((e) => {
							const path = e.path.join('.');
							return path ? `${path}: ${e.message}` : e.message;
						})
						.join('; ');

					throw createError({
						message: 'Invalid repository data',
						kind: 'validation_error',
						description: errorMessage
					});
				}

				// Handle Tauri errors
				throw createError(error);
			}
		},
		enabled: !!path(),
		...options
	}));
}
