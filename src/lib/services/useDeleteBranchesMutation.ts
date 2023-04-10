import type { IBranch } from '$lib/stores';
import { createMutation, useQueryClient, type CreateMutationOptions } from '@tanstack/svelte-query';

interface DeleteBranchesVariables {
	branches: IBranch[];
	path: string;
}

type DeleteBranchesMutationOptions = CreateMutationOptions<
	string[],
	string[],
	DeleteBranchesVariables,
	unknown
>;

export function useDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<string[], string[], DeleteBranchesVariables>(
		['branches', 'delete'],
		async (vars) => {
			const { invoke } = await import('@tauri-apps/api/tauri');

			const client = useQueryClient();

			client.invalidateQueries(['branches', 'get-all', vars.path]);

			const res: string = await invoke('delete_branches', {
				deleteOptions: [
					vars.path,
					vars.branches
						.map((item) => item.name)
						.toString()
						.replace(/,/g, ' ')
						.trim()
				]
			});

			const resParser = JSON.parse(res);

			const errors = resParser.errors
				.trim()
				.split('\n')
				.map((item: string) => item.trim());

			if (resParser.errors.length > 0) return Promise.reject(errors);

			return resParser.result
				.trim()
				.split('\n')
				.map((item: string) => item.trim());
		},
		options
	);
}
