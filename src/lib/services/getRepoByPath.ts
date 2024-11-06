import { repositories, type RepositoryData } from '$lib/stores/repos.svelte';
import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';

import { invoke } from '@tauri-apps/api/core';
import type { ServiceError } from './models';

export function getRepoByPath(
	path: () => string,
	options?: Omit<
		CreateQueryOptions<RepositoryData, ServiceError, RepositoryData, string[]>,
		'queryKey' | 'queryFn'
	>
) {
	return createQuery<RepositoryData, ServiceError, RepositoryData, string[]>(() => ({
		queryKey: ['branches', 'get-all', path()],
		queryFn: async () => {
			return invoke<string>('get_repo_info', { path: path() }).then((res) => {
				const resParser = JSON.parse(res) satisfies RepositoryData;

				const root_path = resParser.root_path;
				let name: string;

				if (root_path.lastIndexOf('/')) {
					name = root_path.substring(root_path.lastIndexOf('/') + 1);
				} else {
					name = root_path.substring(root_path.lastIndexOf('\\') + 1);
				}

				const data: RepositoryData = {
					path: root_path,
					branches: resParser.branches,
					name,
					current_branch: resParser.current_branch
				};

				repositories.updateBranchesCount(data.path, data.branches.length);
				return data;
			});
		},
		...options
	}));
}
