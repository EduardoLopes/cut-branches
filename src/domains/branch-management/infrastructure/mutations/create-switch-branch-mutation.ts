import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';
import { extractResource } from '$infrastructure/query-key-utils';

export function createSwitchBranchMutation(options?: TauriMutationOptions<'updateCurrentBranch'>) {
	return createTauriMutation('updateCurrentBranch', {
		...options,
		meta: {
			// A safe checkout legitimately fails when uncommitted changes would be
			// overwritten — the user has to hear about it.
			showErrorNotification: true,
			...options?.meta,
			awaitInvalidates: [[extractResource('getRepository')]]
		}
	});
}
