import { repos, type RepoID } from '$lib/stores';
import { createQuery, type CreateQueryOptions, type QueryKey } from '@tanstack/svelte-query';

interface RootPath {
	root_path: string;
	id: string;
}

export function useGetRootPath(path?: string, options?: CreateQueryOptions<RepoID, string[]>) {
	return createQuery(
		['repository', 'root-path', path] as QueryKey,
		async () => {
			const { invoke } = await import('@tauri-apps/api/tauri');

			if (!path) return Promise.reject('No path provided');

			const res = await invoke<string>('get_root', { path });

			const resParser = JSON.parse(res) satisfies RootPath;

			const root_path = resParser.root_path;
			let name: string;

			if (root_path.lastIndexOf('/')) {
				name = root_path.substring(root_path.lastIndexOf('/') + 1);
			} else {
				name = root_path.substring(root_path.lastIndexOf('\\') + 1);
			}

			const data: RepoID = {
				path: root_path,
				name,
				id: String(resParser.id)
			};

			repos.update((items) => {
				items = items.filter((item) => item.id !== data.id);
				items.push(data);

				return items;
			});

			return data;
		},
		options
	);
}
