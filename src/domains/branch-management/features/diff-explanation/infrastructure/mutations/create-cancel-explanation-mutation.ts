import {
	createTauriMutation,
	type TauriMutationOptions
} from '$infrastructure/create-tauri-mutation';

/**
 * Server-state adapter (§1.2) for cancelling an in-flight explanation (single
 * or batch) by its correlation id. The backend fires a one-shot kill signal;
 * the aborted `create*` mutation then rejects with `explanation_cancelled`.
 */
export function createCancelExplanationMutation(
	options?: TauriMutationOptions<'cancelExplanation'>
) {
	return createTauriMutation('cancelExplanation', { ...options });
}
