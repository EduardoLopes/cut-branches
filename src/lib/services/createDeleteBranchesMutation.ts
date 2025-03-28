import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { Branch } from '$lib/stores/repository.svelte';

interface DeleteBranchesVariables {
	branches: Branch[];
	path: string;
}

type DeleteBranchesMutationOptions = CreateMutationOptions<
	string[],
	ServiceError,
	DeleteBranchesVariables,
	unknown
>;

export function createDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
	return createMutation<string[], ServiceError, DeleteBranchesVariables>(() => ({
		mutationKey: ['branches', 'delete'],
		mutationFn: async (vars) => {
			return invoke<string>('delete_branches', {
				path: vars.path,
				branches: vars.branches.map((item) => item.name)
			}).then((res) => {
				const resParser = JSON.parse(res) as string[];

				return resParser.map((item: string) => item.trim());
			});
		},
		...options
	}));
}
