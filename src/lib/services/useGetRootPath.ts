import { createQuery, type CreateQueryOptions, type QueryKey } from '@tanstack/svelte-query';

interface RootPath {
	root_path: string;
	error: string[];
}

interface RootPathResponse {
	path: string;
	name: string;
}

export function useGetRootPath(
	path?: string,
	options?: CreateQueryOptions<RootPathResponse, string[]>
) {
	return createQuery(
		['repository', 'root-path', path] as QueryKey,
		async () => {
			const { invoke } = await import('@tauri-apps/api/tauri');

			if (!path) return Promise.reject('No path provided');

			const res = await invoke<string>('get_root', { path });

			const resParser = JSON.parse(res) satisfies RootPath;

			const errors = resParser.errors;

			if (errors.length > 0) return Promise.reject(errors);

			const root_path = resParser.root_path;
			let name: string;

			if (root_path.lastIndexOf('/')) {
				name = root_path.substring(root_path.lastIndexOf('/') + 1);
			} else {
				name = root_path.substring(root_path.lastIndexOf('\\') + 1);
			}

			const data: RootPathResponse = {
				path: root_path,
				name
			};

			return data;
		},
		options
	);
}
