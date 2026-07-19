<script lang="ts">
	// The expanded body of a changed-file row: fetches the file's hunks and
	// feeds them to the shared DiffViewer pattern. This panel owns everything
	// that talks to the backend — the diff query and the hidden-context
	// expansion (getFileLines) — while the viewer owns all rendering.
	import Alert from '@pindoba/svelte-alert';
	import Loading from '@pindoba/svelte-loading';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { createGetFileDiffQuery } from '../infrastructure/queries/create-get-file-diff-query';
	import { getDiffLanguage } from '../models/diff-language';
	import type { ChangedFile, DiffLine } from '$infrastructure/bindings';
	import { executeCommand } from '$infrastructure/tauri-commands';
	import type { DiffGap } from '$ui/patterns/diff-viewer/diff-gaps';
	import DiffViewer from '$ui/patterns/diff-viewer/diff-viewer.svelte';
	import type {
		DiffViewerGutter,
		DiffViewerLayout,
		DiffViewerVariant
	} from '$ui/patterns/diff-viewer/types';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Filesystem path of the repository. */
		repositoryPath: string;
		/** Diff target — exactly one of the two is set. */
		branchName?: string | null;
		commitSha?: string | null;
		/** The changed-files entry this panel expands. */
		file: ChangedFile;
		/** Active search term — occurrences inside the code render marked. */
		searchTerm?: string;
		/** Viewer options, passed through. */
		layout?: DiffViewerLayout;
		variant?: DiffViewerVariant;
		gutter?: DiffViewerGutter;
		wrap?: boolean;
	}

	let {
		repositoryPath,
		branchName = null,
		commitSha = null,
		file,
		searchTerm = '',
		layout = 'unified',
		variant = 'background',
		gutter = 'single',
		wrap = false
	}: Props = $props();

	const diffQuery = createGetFileDiffQuery(() => ({
		path: repositoryPath,
		branchName,
		commitSha,
		filePath: file.path,
		oldPath: file.oldPath
	}));

	const language = $derived(getDiffLanguage(file.path));

	// --- Context expansion ---------------------------------------------------

	/** Expanded context lines per gap id. An empty array means the gap turned
	 *  out to be empty (e.g. the tail gap of a file that ends at the hunk). */
	const expandedGaps = new SvelteMap<string, DiffLine[]>();
	const loadingGaps = new SvelteSet<string>();
	const gapErrors = new SvelteMap<string, string>();

	async function expandGap(gap: DiffGap) {
		loadingGaps.add(gap.id);
		gapErrors.delete(gap.id);
		try {
			const output = await executeCommand('getFileLines', {
				path: repositoryPath,
				branchName,
				commitSha,
				filePath: file.path,
				startLine: gap.startLine,
				endLine: gap.endLine
			});
			expandedGaps.set(
				gap.id,
				output.lines.map((content, index) => ({
					kind: 'context' as const,
					content,
					newLineNo: gap.startLine + index,
					oldLineNo: gap.startLine + index + gap.oldDelta
				}))
			);
		} catch (error) {
			const appError = error as { description?: string | null; message?: string };
			gapErrors.set(gap.id, appError.description ?? appError.message ?? 'Failed to load lines');
		} finally {
			loadingGaps.delete(gap.id);
		}
	}

	const host = css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'sm',
		// The diff scrolls horizontally INSIDE the card: the panel must never
		// widen its host, so it caps itself at the available width.
		minWidth: '0',
		maxWidth: '100%'
	});
	const noticeText = css({ color: 'neutral.text.muted', fontSize: 'sm', px: 'xs' });
</script>

<div class={host} data-testid="file-diff-panel">
	{#if diffQuery.isLoading}
		<div class={css({ display: 'flex', justifyContent: 'center', py: 'sm' })}>
			<Loading loading data-testid="file-diff-loading">
				<span class={noticeText}>Loading diff…</span>
			</Loading>
		</div>
	{:else if diffQuery.isError}
		<Alert feedback="danger" emphasis="secondary" data-testid="file-diff-error">
			{diffQuery.error.description ?? diffQuery.error.message}
		</Alert>
	{:else if diffQuery.data}
		{@const diff = diffQuery.data}
		{#if diff.isBinary}
			<p class={noticeText} data-testid="file-diff-binary">
				Binary file — no textual diff to show.
			</p>
		{:else if diff.hunks.length === 0}
			<p class={noticeText} data-testid="file-diff-empty">
				No content changes{diff.status === 'renamed' ? ' — file was renamed' : ''}.
			</p>
		{:else}
			<DiffViewer
				hunks={diff.hunks}
				status={diff.status}
				{language}
				{layout}
				{variant}
				{gutter}
				{wrap}
				{searchTerm}
				onExpandGap={expandGap}
				{expandedGaps}
				{loadingGaps}
				{gapErrors}
			/>
			{#if diff.truncated}
				<p class={noticeText} data-testid="file-diff-truncated">
					This diff is very large and was truncated.
				</p>
			{/if}
		{/if}
	{/if}
</div>
