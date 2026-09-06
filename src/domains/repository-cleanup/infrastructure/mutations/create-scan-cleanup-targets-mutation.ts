import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for scanning a single repository's cleanable
 * folders. Triggered explicitly when the cleanup modal opens.
 */
export function createScanCleanupTargetsMutation(
	options?: TauriMutationOptions<'scanCleanupTargets'>
) {
	return createTauriMutation('scanCleanupTargets', { ...options });
}
