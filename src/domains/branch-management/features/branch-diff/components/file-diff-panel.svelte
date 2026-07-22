<script lang="ts">
	// The expanded body of a changed-file row: fetches the file's hunks and
	// feeds them to the shared DiffViewer pattern. This panel owns everything
	// that talks to the backend — the diff query and the hidden-context
	// expansion (getFileLines) — while the viewer owns all rendering.
	import Icon from '@iconify/svelte';
	import Alert from '@pindoba/svelte-alert';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { createGetFileDiffQuery } from '../infrastructure/queries/create-get-file-diff-query';
	import { getDiffLanguage } from '../models/diff-language';
	import type { ChangedFile, DiffHunk, DiffLine } from '$infrastructure/bindings';
	import { executeCommand } from '$infrastructure/tauri-commands';
	import type { DiffGap } from '$ui/patterns/diff-viewer/diff-gaps';
	import DiffViewer from '$ui/patterns/diff-viewer/diff-viewer.svelte';
	import {
		countDiffLines,
		DIFF_HIGHLIGHT_MAX_LINES,
		DIFF_RENDER_GATE_LINES
	} from '$ui/patterns/diff-viewer/render-budget';
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
		/** Per-change AI explanations, keyed by 1-based hunk number. Rendered
		 *  inline under each hunk's last line, like a review comment. */
		hunkExplanations?: ReadonlyMap<number, string>;
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
		wrap = false,
		hunkExplanations = undefined
	}: Props = $props();

	const diffQuery = createGetFileDiffQuery(() => ({
		path: repositoryPath,
		branchName,
		commitSha,
		filePath: file.path,
		oldPath: file.oldPath
	}));

	const language = $derived(getDiffLanguage(file.path));

	// --- Inline per-hunk explanations ----------------------------------------
	// Anchor each hunk's explanation to its last CHANGED line (added/removed),
	// so the comment sits right beneath the change instead of below the hunk's
	// trailing context. Keyed by line number (new side when present, else old)
	// — stable across the viewer's plain and progressive render paths, which
	// both carry the original line numbers.

	function lineKey(line: DiffLine): string {
		return line.newLineNo != null ? `n${line.newLineNo}` : `o${line.oldLineNo}`;
	}

	/** The hunk's last added/removed line — where its explanation anchors. */
	function anchorLine(hunk: DiffHunk): DiffLine | undefined {
		for (let i = hunk.lines.length - 1; i >= 0; i -= 1) {
			const line = hunk.lines[i];
			if (line.kind === 'added' || line.kind === 'removed') {
				return line;
			}
		}
		return hunk.lines.at(-1);
	}

	const annotationByLineKey = $derived.by(() => {
		const hunks = diffQuery.data?.hunks;
		const explanations = hunkExplanations;
		if (!explanations || explanations.size === 0 || !hunks) {
			return new Map<string, string>();
		}
		// Build from entries (no mutation) so each hunk's anchor line maps to its
		// explanation text.
		const entries = hunks
			.map((hunk, index): [string, string] | null => {
				const text = explanations.get(index + 1);
				const anchor = anchorLine(hunk);
				return text && anchor ? [lineKey(anchor), text] : null;
			})
			.filter((entry): entry is [string, string] => entry !== null);
		return new Map(entries);
	});

	function hasAnnotation(line: DiffLine): boolean {
		return annotationByLineKey.has(lineKey(line));
	}

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

	// --- Large-diff gate -------------------------------------------------------
	// Huge diffs (see the diff-viewer render budgets) are not mounted unasked:
	// past the gate the panel shows a message with an explicit "Show diff"
	// affordance instead. Past the (smaller) highlight budget the viewer
	// renders plain text, and the panel says so.

	let renderLargeDiff = $state(false);

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

	// A GitHub-style review comment anchored under a hunk's change, labelled as
	// AI-generated. `sticky left` pins it to the visible edge so it reads as a
	// comment even when the diff is scrolled horizontally; the max-width keeps
	// it comment-shaped rather than a full-width banner.
	const annotation = css({
		position: 'sticky',
		left: '0',
		display: 'flex',
		flexDirection: 'column',
		gap: '2xs',
		my: 'xs',
		mx: 'sm',
		p: 'sm',
		maxWidth: 'min(72ch, calc(100% - token(spacing.md)))',
		fontFamily: 'body',
		background: 'neutral.surface.step.3',
		border: '1px solid token(colors.primary.border.muted)',
		borderRadius: 'md'
	});
	const annotationHeader = css({
		display: 'flex',
		alignItems: 'center',
		gap: '2xs',
		fontSize: 'xs',
		fontWeight: 'bold',
		color: 'primary.text'
	});
	const annotationBody = css({
		m: '0',
		fontSize: 'sm',
		lineHeight: '1.5',
		color: 'neutral.text',
		whiteSpace: 'pre-wrap',
		wordBreak: 'break-word'
	});
</script>

{#snippet hunkAnnotation(line: DiffLine)}
	{@const text = annotationByLineKey.get(lineKey(line))}
	{#if text}
		<div class={annotation} data-testid="hunk-explanation">
			<span class={annotationHeader}>
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:sparkles" width="13px" height="13px" />
				</Stamp>
				AI explanation
			</span>
			<p class={annotationBody}>{text}</p>
		</div>
	{/if}
{/snippet}

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
			<!-- The gate counts the diff's own lines only: expanded hidden-context
			     lines the user asked for must never push an already-rendered diff
			     back behind the gate. The highlight notice, by contrast, mirrors
			     the viewer's budget, which does count expanded lines. -->
			{@const gateLines = countDiffLines(diff.hunks)}
			{@const totalDiffLines = countDiffLines(diff.hunks, expandedGaps)}
			{#if gateLines > DIFF_RENDER_GATE_LINES && !renderLargeDiff}
				<Alert feedback="warning" emphasis="secondary" data-testid="file-diff-large">
					<span>
						This file's diff is very large ({gateLines} lines) — rendering it may take a moment.
					</span>
					<Button
						emphasis="secondary"
						size="xs"
						onclick={() => (renderLargeDiff = true)}
						data-testid="file-diff-render-anyway"
					>
						Show diff
					</Button>
				</Alert>
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
					lineAnnotation={hunkAnnotation}
					annotatedLine={hasAnnotation}
				/>
				{#if language !== null && totalDiffLines > DIFF_HIGHLIGHT_MAX_LINES}
					<p class={noticeText} data-testid="file-diff-plain-text">
						Syntax highlighting is off for this large diff.
					</p>
				{/if}
				{#if diff.truncated}
					<p class={noticeText} data-testid="file-diff-truncated">
						This diff is very large and was truncated.
					</p>
				{/if}
			{/if}
		{/if}
	{/if}
</div>
