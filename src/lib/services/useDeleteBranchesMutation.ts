import type { IBranch } from '$lib/stores/branches';
import { createMutation, type CreateMutationOptions } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';
import type { ServiceError } from './models';

interface DeleteBranchesVariables {
	branches: IBranch[];
	path: string;
}

type DeleteBranchesMutationOptions = CreateMutationOptions<
	string[],
	ServiceError,
	DeleteBranchesVariables,
	unknown
>;

export function useDeleteBranchesMutation(options?: DeleteBranchesMutationOptions) {
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
