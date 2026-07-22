import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { SvelteMap } from 'svelte/reactivity';
import { createCancelExplanationMutation } from '../infrastructure/mutations/create-cancel-explanation-mutation';
import { createDiffExplanationBatchMutation } from '../infrastructure/mutations/create-diff-explanation-batch-mutation';
import { parseHunkExplanations } from '../models/parse-hunk-explanations';
import type {
	AppError,
	ExplanationBatchProgressEvent,
	ExplanationChunkEvent,
	ExplanationDetail,
	ExplanationFileCompletedEvent,
	ExplanationStyle
} from '$infrastructure/bindings';

/** Per-file streaming state within a batch. */
export interface BatchFileState {
	text: string;
	status: 'streaming' | 'done' | 'error';
	error?: string;
	/** Present in per-change batches: this file's per-hunk explanations, keyed
	 *  by 1-based hunk number, for inline rendering in the diff. */
	hunks?: ReadonlyMap<number, string>;
}

/** Target + repository context for the batch. */
interface UseDiffExplanationBatchOptions {
	getPath: () => string;
	getBranchName: () => string | null;
	getCommitSha: () => string | null;
}

function messageOf(error: unknown): string {
	const appError = error as Partial<AppError> | null;
	return appError?.description ?? appError?.message ?? 'Explanation failed';
}

/**
 * Application logic (§1.2) for the "Generate all" batch. One backend command
 * explains every changed file sequentially; this composable multiplexes the
 * three streamed events — chunk / file-completed / batch-progress, all keyed
 * by one `batchId` — into a per-file state map plus a `{ done, total }`
 * progress. Same streamed-progress shape as the single-file composable.
 */
export function useDiffExplanationBatch(options: UseDiffExplanationBatchOptions) {
	const batchId = crypto.randomUUID();
	const mutation = createDiffExplanationBatchMutation();
	const cancelMutation = createCancelExplanationMutation();

	// filePath → its streaming state. Mutated in place; SvelteMap is reactive.
	const files = new SvelteMap<string, BatchFileState>();
	let done = $state(0);
	let total = $state(0);
	let error = $state<string | null>(null);
	let cancelled = $state(false);
	// The granularity the current run was launched with — decides whether to
	// parse each file's text into per-hunk sections for inline rendering.
	let detailChoice = $state<ExplanationDetail>('file');

	function ensure(filePath: string): BatchFileState {
		let state = files.get(filePath);
		if (!state) {
			state = { text: '', status: 'streaming' };
			files.set(filePath, state);
		}
		return state;
	}

	/** Adds the parsed per-hunk map when the run is per-change. */
	function withHunks(state: BatchFileState): BatchFileState {
		if (detailChoice !== 'hunks') {
			return state;
		}
		return {
			...state,
			hunks: new SvelteMap(parseHunkExplanations(state.text).map((hunk) => [hunk.index, hunk.text]))
		};
	}

	/** Runs the batch over `filePaths`, or the whole changeset when omitted. */
	async function generate(
		filePaths?: string[],
		style: ExplanationStyle = 'succinct',
		detail: ExplanationDetail = 'file'
	) {
		files.clear();
		done = 0;
		total = filePaths?.length ?? 0;
		error = null;
		cancelled = false;
		detailChoice = detail;

		const unlisteners: UnlistenFn[] = [];
		try {
			unlisteners.push(
				await listen<ExplanationChunkEvent>('explanation-chunk', (event) => {
					if (event.payload.requestId !== batchId) return;
					const state = ensure(event.payload.filePath);
					files.set(
						event.payload.filePath,
						withHunks({
							...state,
							text: state.text + event.payload.delta,
							status: 'streaming'
						})
					);
				})
			);
			unlisteners.push(
				await listen<ExplanationFileCompletedEvent>('explanation-file-completed', (event) => {
					if (event.payload.requestId !== batchId) return;
					files.set(
						event.payload.filePath,
						withHunks({
							text: event.payload.text,
							status: event.payload.error ? 'error' : 'done',
							error: event.payload.error ?? undefined
						})
					);
				})
			);
			unlisteners.push(
				await listen<ExplanationBatchProgressEvent>('explanation-batch-progress', (event) => {
					if (event.payload.batchId !== batchId) return;
					done = event.payload.done;
					total = event.payload.total;
				})
			);
		} catch {
			// No Tauri runtime (tests): proceed without live streaming.
		}

		try {
			const output = await mutation.mutateAsync({
				batchId,
				path: options.getPath(),
				branchName: options.getBranchName(),
				commitSha: options.getCommitSha(),
				filePaths: filePaths ?? null,
				style,
				detail
			});
			total = output.total;
		} catch (e) {
			if ((e as Partial<AppError>)?.kind === 'explanation_cancelled') {
				cancelled = true;
			} else {
				error = messageOf(e);
			}
		} finally {
			for (const unlisten of unlisteners) unlisten();
		}
	}

	/** Cancels the in-flight batch, if any. */
	async function cancel() {
		await cancelMutation.mutateAsync({ id: batchId });
	}

	return {
		get isRunning() {
			return mutation.isPending;
		},
		get done() {
			return done;
		},
		get total() {
			return total;
		},
		get error() {
			return error;
		},
		get cancelled() {
			return cancelled;
		},
		/** This file's streaming state, or `undefined` before it starts. */
		get(filePath: string): BatchFileState | undefined {
			return files.get(filePath);
		},
		generate,
		cancel
	};
}
