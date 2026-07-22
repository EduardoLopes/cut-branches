import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for explaining a single changed file. The agent
 * runs in the Rust backend; text streams back via `explanation-chunk` events
 * (see `useFileExplanation`), and this mutation resolves with the full text.
 * No cache invalidation — explanations are not a cached query resource.
 */
export function createFileExplanationMutation(
	options?: TauriMutationOptions<'createFileExplanation'>
) {
	return createTauriMutation('createFileExplanation', { ...options });
}
