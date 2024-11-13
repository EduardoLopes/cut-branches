import { type CreateMutationOptions, createMutation } from '@tanstack/svelte-query';
import { invoke } from '@tauri-apps/api/core';

type CreateSwitchbranchMutationOptions = CreateMutationOptions<
	string,
	ServiceError,
	{ path: string; branch: string },
	unknown
>;

export function createSwitchbranchMutation(options?: CreateSwitchbranchMutationOptions) {
	return createMutation(() => ({
		mutationKey: ['switch-branch'],
		mutationFn: async ({ path, branch }) => {
			if (!path) return Promise.reject('No path provided');

			return invoke<string>('switch_branch', { path, branch }).then((res) => {
				return res;
			});
		},
		...options
	}));
}
