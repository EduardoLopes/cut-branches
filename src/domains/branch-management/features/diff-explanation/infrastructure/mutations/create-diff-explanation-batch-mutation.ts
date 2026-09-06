import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for the "Generate all" batch: every changed file
 * (or a named subset) is explained sequentially in the backend. Per-file text
 * streams via `explanation-chunk`/`explanation-file-completed` events (see
 * `useDiffExplanationBatch`); this mutation resolves once the batch finishes.
 */
export function createDiffExplanationBatchMutation(
	options?: TauriMutationOptions<'createDiffExplanationBatch'>
) {
	return createTauriMutation('createDiffExplanationBatch', { ...options });
}
