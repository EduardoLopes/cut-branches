import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { ServiceError } from './models';
import { repositories, type Repository } from '$lib/stores/repos.svelte';

export function getRepoByPath(
	path: () => string | undefined,
	options?: Omit<
		CreateQueryOptions<Repository, ServiceError, Repository, string[]>,
		'queryKey' | 'queryFn'
	>
) {
	return createQuery<Repository, ServiceError, Repository, string[]>(() => ({
		queryKey: ['branches', 'get-all', path() ?? ''],
		queryFn: async () => {
			return invoke<string>('get_repo_info', { path: path() }).then((res) => {
				const resParser = JSON.parse(res) as Repository;
				repositories.add(resParser);
				return resParser;
			});
		},
		enabled: !!path(),
		...options
	}));
}
