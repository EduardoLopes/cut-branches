import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { createCancelExplanationMutation } from '../infrastructure/mutations/create-cancel-explanation-mutation';
import { createFileExplanationMutation } from '../infrastructure/mutations/create-file-explanation-mutation';
import type { AppError, ExplanationChunkEvent, ExplanationStyle } from '$infrastructure/bindings';

/** Target + repository context for the file being explained. */
interface UseFileExplanationOptions {
	getPath: () => string;
	getBranchName: () => string | null;
	getCommitSha: () => string | null;
}

/** Reads the human-facing message off a rejected mutation, tolerating shapes. */
function messageOf(error: unknown): string {
	const appError = error as Partial<AppError> | null;
	return appError?.description ?? appError?.message ?? 'Explanation failed';
}

/**
 * Application logic (§1.2) for explaining one changed file with the local CLI
 * agent. Streams the agent's text into `text` token-by-token via the
 * `explanation-chunk` event, then reconciles with the command's authoritative
 * return value. Mirrors `useCleanupTargets`' streamed-progress shape; the
 * try/catch around `listen` tolerates the no-Tauri test environment.
 */
export function useFileExplanation(options: UseFileExplanationOptions) {
	// Correlates this instance's streamed chunks and its cancellation.
	const requestId = crypto.randomUUID();
	const mutation = createFileExplanationMutation();
	const cancelMutation = createCancelExplanationMutation();

	let text = $state('');
	let error = $state<string | null>(null);
	let hasRun = $state(false);
	let cancelled = $state(false);

	/** Runs the explanation for `filePath`, streaming text as it arrives. */
	async function explain(
		filePath: string,
		oldPath: string | null = null,
		style: ExplanationStyle = 'succinct'
	) {
		text = '';
		error = null;
		cancelled = false;
		hasRun = true;

		let unlisten: UnlistenFn | undefined;
		try {
			unlisten = await listen<ExplanationChunkEvent>('explanation-chunk', (event) => {
				if (event.payload.requestId === requestId && event.payload.filePath === filePath) {
					text += event.payload.delta;
				}
			});
		} catch {
			// `listen` rejects outside a Tauri runtime (e.g. tests) — degrade gracefully.
		}

		try {
			const output = await mutation.mutateAsync({
				requestId,
				path: options.getPath(),
				branchName: options.getBranchName(),
				commitSha: options.getCommitSha(),
				filePath,
				oldPath,
				style
			});
			// The return value is authoritative — it also covers the no-listen
			// (test) path where no chunks were received.
			text = output.text;
		} catch (e) {
			if ((e as Partial<AppError>)?.kind === 'explanation_cancelled') {
				cancelled = true;
			} else {
				error = messageOf(e);
			}
		} finally {
			unlisten?.();
		}
	}

	/** Cancels the in-flight explanation, if any. */
	async function cancel() {
		await cancelMutation.mutateAsync({ id: requestId });
	}

	return {
		get text() {
			return text;
		},
		get isStreaming() {
			return mutation.isPending;
		},
		get error() {
			return error;
		},
		get hasRun() {
			return hasRun;
		},
		get cancelled() {
			return cancelled;
		},
		explain,
		cancel
	};
}
