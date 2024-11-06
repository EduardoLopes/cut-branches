import { repositories, type Repository } from '$lib/stores/repos.svelte';
import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import type { ServiceError } from './models';
import { invoke } from '@tauri-apps/api/core';

interface RootPath {
	root_path: string;
	id: string;
}

type CreateRepositoryIDMutationOptions = CreateMutationOptions<
	Repository,
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

				const data: Repository = {
					path: root_path,
					name,
					id: String(resParser.id)
				};

				if (!repositories.findByPath(data.path)) {
					repositories.add(data);
				}

				return data;
			});
		},
		...options
	}));
}
