import { repos, type RepoID } from '$lib/stores/branches';
import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import type { ServiceError } from './models';
import { invoke } from '@tauri-apps/api/tauri';

interface RootPath {
	root_path: string;
	id: string;
}

type CreateRepositoryIDMutationOptions = CreateMutationOptions<
	RepoID,
	ServiceError,
	{ path: string },
	unknown
>;

export function useCreateRepositoryID(options?: CreateRepositoryIDMutationOptions) {
	return createMutation(() => ({
		mutationKey: ['repository', 'create-ID'],
		mutationFn: async ({ path }) => {
			if (!path) return Promise.reject('No path provided');

			return invoke<string>('get_root', { path }).then((res) => {
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
			});
		},
		...options
	}));
}
