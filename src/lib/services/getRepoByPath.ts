import { repos, type IRepo } from '$lib/stores';
import {
	createQuery,
	type QueryKey,
	type StoreOrVal,
	type UndefinedInitialDataOptions
} from '@tanstack/svelte-query';

import { invoke } from '@tauri-apps/api/tauri';
import type { ServiceError } from './models';

export function getRepoByPath(
	path: string,
	options?: Omit<
		StoreOrVal<UndefinedInitialDataOptions<IRepo, ServiceError, IRepo, QueryKey>>,
		'queryKey' | 'queryFn'
	>
) {
	return createQuery({
		queryKey: ['branches', 'get-all', path] as QueryKey,
		queryFn: async () => {
			return invoke<string>('get_repo_info', { path }).then((res) => {
				const resParser = JSON.parse(res) satisfies IRepo;

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
					const repo = items.find((item) => item.path === data.path);

					if (repo) {
						repo.branchesCount = data.branches.length;
					}

					return [...items];
				});

				return data;
			});
		},
		...options
	});
}
