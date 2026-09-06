import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { createCancelExplanationMutation } from '../infrastructure/mutations/create-cancel-explanation-mutation';
import { createHunkExplanationMutation } from '../infrastructure/mutations/create-hunk-explanation-mutation';
import { parseHunkExplanations } from '../models/parse-hunk-explanations';
import type { AppError, ExplanationChunkEvent, ExplanationStyle } from '$infrastructure/bindings';

/** One change group's explanation, paired with its diff header once known. */
export interface HunkExplanation {
	index: number;
	/** The git `@@ … @@` header of this hunk; undefined until the run resolves. */
	header?: string;
	text: string;
}

interface UseHunkExplanationOptions {
	getPath: () => string;
	getBranchName: () => string | null;
	getCommitSha: () => string | null;
}

function messageOf(error: unknown): string {
	const appError = error as Partial<AppError> | null;
	return appError?.description ?? appError?.message ?? 'Explanation failed';
}

/**
 * Application logic (§1.2) for explaining one file hunk by hunk. Streams the
 * agent's marker-delimited text and re-parses the running buffer into ordered
 * per-hunk sections; on completion it pairs each section with the hunk's git
 * header from the command's return value. Same shape as `useFileExplanation`.
 */
export function useHunkExplanation(options: UseHunkExplanationOptions) {
	const requestId = crypto.randomUUID();
	const mutation = createHunkExplanationMutation();
	const cancelMutation = createCancelExplanationMutation();

	let raw = $state('');
	let headers = $state<string[]>([]);
	let error = $state<string | null>(null);
	let hasRun = $state(false);
	let cancelled = $state(false);

	// The running buffer, split into sections and labelled with headers as they
	// become known (headers only arrive when the command resolves).
	const hunks = $derived<HunkExplanation[]>(
		parseHunkExplanations(raw).map((hunk) => ({
			index: hunk.index,
			header: headers[hunk.index - 1],
			text: hunk.text
		}))
	);

	/** Runs the per-hunk explanation for `filePath`, streaming as it arrives. */
	async function explain(
		filePath: string,
		oldPath: string | null = null,
		style: ExplanationStyle = 'succinct'
	) {
		raw = '';
		headers = [];
		error = null;
		cancelled = false;
		hasRun = true;

		let unlisten: UnlistenFn | undefined;
		try {
			unlisten = await listen<ExplanationChunkEvent>('explanation-chunk', (event) => {
				if (event.payload.requestId === requestId && event.payload.filePath === filePath) {
					raw += event.payload.delta;
				}
			});
		} catch {
			// No Tauri runtime (tests) — degrade gracefully.
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
			// Authoritative: also covers the no-listen (test) path and labels the
			// sections with their real headers.
			raw = output.text;
			headers = output.hunkHeaders;
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

	async function cancel() {
		await cancelMutation.mutateAsync({ id: requestId });
	}

	return {
		get text() {
			return raw;
		},
		get hunks() {
			return hunks;
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
