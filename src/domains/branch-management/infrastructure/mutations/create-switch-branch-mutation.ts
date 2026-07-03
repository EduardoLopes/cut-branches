import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';
import { extractResource } from '$infrastructure/query-key-utils';

export function createSwitchBranchMutation(options?: TauriMutationOptions<'updateCurrentBranch'>) {
	return createTauriMutation('updateCurrentBranch', {
		...options,
		meta: {
			...options?.meta,
			awaitInvalidates: [[extractResource('getRepository')]]
		}
	});
}
