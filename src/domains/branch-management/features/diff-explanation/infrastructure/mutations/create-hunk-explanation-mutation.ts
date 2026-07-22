import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for explaining a single file one hunk at a time.
 * The agent echoes `@@HUNK n@@` markers around each hunk's explanation; text
 * streams back via `explanation-chunk` events (see `useHunkExplanation`), and
 * this mutation resolves with the full text plus the ordered hunk headers.
 */
export function createHunkExplanationMutation(
	options?: TauriMutationOptions<'createHunkExplanation'>
) {
	return createTauriMutation('createHunkExplanation', { ...options });
}
