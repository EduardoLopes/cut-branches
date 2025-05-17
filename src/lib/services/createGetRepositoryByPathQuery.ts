import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { Repository } from '$lib/stores/repository.svelte';

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
			return invoke<string>('get_repo_info', { path: path() }).then((res) => {
				const resParser = JSON.parse(res) as Repository;
				return resParser;
			});
		},
		enabled: !!path(),
		...options
	}));
}
