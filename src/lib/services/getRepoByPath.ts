import type { IRepo } from '$lib/stores';
import { createQuery, type CreateQueryOptions, type QueryKey } from '@tanstack/svelte-query';
import { repos } from '$lib/stores';

export function getRepoByPath(path: string, options?: CreateQueryOptions<IRepo, string[]>) {
	return createQuery(
		['branches', 'get-all', path] as QueryKey,
		async () => {
			const { invoke } = await import('@tauri-apps/api/tauri');

			const res = await invoke<string>('git_repo_dir', { path });

			const resParser = JSON.parse(res) satisfies IRepo;

			console.log('asldijaslkdças');

			const errors = resParser.errors;

			if (errors.length > 0) return Promise.reject(errors);

			const root_path = resParser.root_path;
			let name: string;

			if (root_path.lastIndexOf('/')) {
				name = root_path.substring(root_path.lastIndexOf('/') + 1);
			} else {
				name = root_path.substring(root_path.lastIndexOf('\\') + 1);
			}

			const data: IRepo = {
				path: root_path,
				branches: resParser.branches,
				name,
				current_branch: resParser.current_branch
			};

			repos.update((items) => {
				items = items.filter((item) => item.name !== data.name);
				items.push(data);

				return items;
			});

			return data;
		},
		options
	);
}