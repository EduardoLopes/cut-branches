import type { IBranch } from '$lib/stores';
import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';

interface DeleteBranchesVariables {
	branches: IBranch[];
	path: string;
}

type DeleteBranchesMutationOptions = CreateMutationOptions<
	DeletedBranches,
	unknown,
	DeleteBranchesVariables,
	unknown
>;

export interface DeletedBranches {
	result: string[];
	errors: string[];
}

export function deleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<DeletedBranches, unknown, DeleteBranchesVariables>(
		['branches', 'delete'],
		async (vars) => {
			const { invoke } = await import('@tauri-apps/api/tauri');

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
			const result = resParser.result
				.trim()
				.split('\n')
				.map((item: string) => item.trim());

			if (resParser.errors.length > 0) return Promise.reject(errors);

			return {
				result,
				errors
			};
		},
		options
	);
}
