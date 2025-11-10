import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';
import { extractResource } from '$utils/query-key-utils';

export function createSwitchBranchMutation(options?: TauriMutationOptions<'updateCurrentBranch'>) {
	return createTauriMutation('updateCurrentBranch', {
		...options,
		meta: {
			...options?.meta,
			awaitInvalidates: [[extractResource('getRepository')]]
		}
	});
}
