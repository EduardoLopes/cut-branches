import { createTauriMutation, type TauriMutationOptions } from '$utils/create-tauri-mutation';

// Active branches mutations

export function createAddSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateBranchSelection'>
) {
	return createTauriMutation('batchCreateBranchSelection', options);
}

export function createRemoveSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteBranchSelection'>
) {
	return createTauriMutation('batchDeleteBranchSelection', options);
}

export function createClearSelectedBranchesMutation(
	options?: TauriMutationOptions<'deleteAllBranchSelection'>
) {
	return createTauriMutation('deleteAllBranchSelection', options);
}

// Deleted branches (restoration) mutations

export function createAddDeletedSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchCreateDeletedBranchSelection'>
) {
	return createTauriMutation('batchCreateDeletedBranchSelection', options);
}

export function createRemoveDeletedSelectedBranchesMutation(
	options?: TauriMutationOptions<'batchDeleteDeletedBranchSelection'>
) {
	return createTauriMutation('batchDeleteDeletedBranchSelection', options);
}

export function createClearDeletedSelectedBranchesMutation(
	options?: TauriMutationOptions<'deleteAllDeletedBranchSelection'>
) {
	return createTauriMutation('deleteAllDeletedBranchSelection', options);
}
