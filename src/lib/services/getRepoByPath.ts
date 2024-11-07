import { createQuery, type CreateQueryOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { ServiceError } from './models';
import { repositories, type Repository } from '$lib/stores/repositories.svelte';

export function getRepoByPath(
	path: () => string | undefined,
	options?: Omit<
		CreateQueryOptions<Repository, ServiceError, Repository, string[]>,
		'queryKey' | 'queryFn'
	>
) {
	const queryKey = ['branches', 'get-all', path() ?? ''];

	const fetchRepositoryInfo = async (): Promise<Repository> => {
		const repoPath = path();
		const response = await invoke<string>('get_repo_info', { path: repoPath });
		const repository = JSON.parse(response) as Repository;
		repositories.add(repository);
		return repository;
	};

	return createQuery(() => ({
		queryKey,
		queryFn: fetchRepositoryInfo,
		enabled: !!path(),
		...options
	}));
}
