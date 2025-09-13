import { getRepositoryStore } from '../store/repository.svelte';
import type { Repository } from '$services/common';
import { createTauriQuery, type TauriQueryWrapperOptions } from '$utils/create-tauri-query';

export function createGetRepositoryQuery(
	path: () => string | undefined,
	options?: TauriQueryWrapperOptions<'getRepository', string[]>
) {
	return createTauriQuery('getRepository', {
		queryKey: ['branches', 'get-all', path() ?? ''],
		input: () => ({ path: path() ?? '' }),
		select: (data) => {
			// Create the repository with processed branches and branch count
			const repository: Repository = {
				...data,
				branchesCount: data.branches.length
			};

			// Update the repository store with the processed data
			const repositoryStore = getRepositoryStore(repository.name);
			if (repositoryStore) {
				repositoryStore.set(repository);
			}

			return repository;
		},
		enabled: !!path(),
		...options
	});
}
