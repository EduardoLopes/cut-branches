<script lang="ts">
	// Reusable diff renderer: takes a file diff's hunks as plain data and
	// renders them as one continuous bordered block — hunk headers, code
	// lines, gap expanders and expanded context share a single horizontal
	// scroll area, so expanding the hidden lines between two hunks fuses them
	// into one uninterrupted run (the following hunk's `@@` header disappears
	// once the line numbers become continuous).
	//
	// The component is pure presentation: it fetches nothing. Gap expansion
	// is callback-driven — the host owns the expanded/loading/error state and
	// passes it back down. Syntax highlighting is progressive enhancement:
	// lines render as plain text immediately and re-render colored once shiki
	// resolves (or stay plain when the language is unknown / highlighting
	// fails).
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import { computeDiffGaps, type DiffGap } from './diff-gaps';
	import { highlightDiffCode } from './highlighter';
	import { buildMarkedRuns } from './line-marks';
	import { pairLines } from './split-lines';
	import type {
		DiffViewerFileStatus,
		DiffViewerGutter,
		DiffViewerHunk,
		DiffViewerLayout,
		DiffViewerLine,
		DiffViewerTokenHover,
		DiffViewerVariant
	} from './types';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** The file diff's hunks, in order. */
		hunks: DiffViewerHunk[];
		/** Change status of the file — drives which gaps are expandable. */
		status?: DiffViewerFileStatus;
		/** Shiki language id; `null`/unknown renders plain text. */
		language?: string | null;
		/** Unified (single column) or split (side-by-side). */
		layout?: DiffViewerLayout;
		/** How added/removed lines are signalled. */
		variant?: DiffViewerVariant;
		/** One number column or the classic old/new pair (unified layout only —
		 *  split always shows one number per side). */
		gutter?: DiffViewerGutter;
		/** Wrap long lines instead of scrolling horizontally. */
		wrap?: boolean;
		/** Active search term — occurrences inside the code render marked. */
		searchTerm?: string;
		/** Called when the user asks to expand a hidden-context gap. Omitting
		 *  it hides the gap expanders entirely. */
		onExpandGap?: (gap: DiffGap) => void;
		/** Expanded context lines per gap id. An empty array means the gap
		 *  turned out to be empty (e.g. a tail gap at EOF). */
		expandedGaps?: ReadonlyMap<string, DiffViewerLine[]>;
		/** Gap ids currently loading their context lines. */
		loadingGaps?: ReadonlySet<string>;
		/** Load failure message per gap id. */
		gapErrors?: ReadonlyMap<string, string>;
		/** Rendered full-width under a line's row — the extension point for
		 *  annotations/comments. In split layout it is called once per row,
		 *  with the new-side line when both sides are present. */
		lineAnnotation?: Snippet<[DiffViewerLine]>;
		/** Fired when the pointer enters a token run of a line. */
		onTokenHover?: (hover: DiffViewerTokenHover) => void;
	}

	let {
		hunks,
		status = 'modified',
		language = null,
		layout = 'unified',
		variant = 'background',
		gutter = 'single',
		wrap = false,
		searchTerm = '',
		onExpandGap,
		expandedGaps,
		loadingGaps,
		gapErrors,
		lineAnnotation,
		onTokenHover
	}: Props = $props();

	// One highlight pass per block of lines: join the contents, tokenize, then
	// zip the per-line tokens back onto the lines by index.
	function highlightLines(lines: DiffViewerLine[]) {
		return highlightDiffCode(lines.map((line) => line.content).join('\n'), language);
	}

	// --- Context expansion ---------------------------------------------------

	const gaps = $derived(onExpandGap ? computeDiffGaps(hunks, status) : []);
	const gapBefore = $derived(
		new Map(gaps.filter((gap) => gap.beforeHunkIndex !== null).map((g) => [g.beforeHunkIndex, g]))
	);
	const tailGap = $derived(gaps.find((gap) => gap.beforeHunkIndex === null));

	/** Whether a gap has been expanded with actual content — the signal that
	 *  the surrounding blocks are now continuous. */
	function isFilled(gap: DiffGap | undefined): boolean {
		return !!gap && (expandedGaps?.get(gap.id)?.length ?? 0) > 0;
	}

	function gapLabel(gap: DiffGap): string {
		if (gap.count === null) {
			return 'Expand rest of file';
		}
		return `Expand ${gap.count} hidden ${gap.count === 1 ? 'line' : 'lines'}`;
	}

	/** The single number a one-column gutter shows: the line's own side. */
	function ownLineNo(line: DiffViewerLine): number | string {
		return (line.kind === 'removed' ? line.oldLineNo : line.newLineNo) ?? '';
	}

	/** The token array a split cell zips onto its line, if any. */
	function tokensAt(
		all: import('shiki').ThemedToken[][] | null,
		index: number | null
	): import('shiki').ThemedToken[] | null {
		if (index === null) {
			return null;
		}
		return all?.[index] ?? null;
	}

	// --- Styles ----------------------------------------------------------------

	// The single container all headers/lines/expanders live in.
	const diffBlock = css({
		border: '1px solid',
		borderColor: 'neutral.border.muted',
		borderRadius: 'sm',
		overflow: 'hidden',
		maxWidth: '100%',
		fontFamily: 'mono',
		fontSize: 'xs'
	});
	const diffScroll = css({ overflowX: 'auto', maxWidth: '100%' });
	// All rows share one max-content wrapper so every row is as wide as the
	// longest line — row backgrounds stay uniform while scrolled. Wrapping
	// mode instead keeps rows at the visible width and lets lines break.
	const diffRows = css({
		minWidth: 'max-content',
		'&[data-wrap="true"]': { minWidth: '0' }
	});
	// Header/expander rows span the full (scrolled) width for their
	// background; their content pins to the visible edge via sticky.
	const stickyContent = css({
		position: 'sticky',
		left: '0',
		display: 'inline-flex',
		alignItems: 'center',
		gap: 'xs',
		maxWidth: '100%'
	});
	const headerRow = css({
		background: 'neutral.surface.step.3',
		color: 'neutral.text.muted',
		whiteSpace: 'pre',
		'& > span': { px: 'sm', py: '2xs' }
	});
	const expanderRow = css({
		background: 'neutral.surface.step.2',
		py: '2xs',
		'& > span': { px: 'xs' }
	});
	// Unified rows: gutter column(s), optional marker column, content. The
	// column set follows the gutter/variant attributes on the rows container.
	const lineRow = css({
		display: 'grid',
		gridTemplateColumns: '3.5em 1fr',
		alignItems: 'baseline',
		'[data-gutter="double"] &': { gridTemplateColumns: '3.5em 3.5em 1fr' },
		'[data-variant="markers"] &': { gridTemplateColumns: '3.5em 1.2em 1fr' },
		'[data-gutter="double"][data-variant="markers"] &': {
			gridTemplateColumns: '3.5em 3.5em 1.2em 1fr'
		}
	});
	// Split rows: number/content per side (one number per side, always).
	const splitRow = css({
		display: 'grid',
		gridTemplateColumns: '3.5em 1fr 3.5em 1fr',
		alignItems: 'baseline',
		'[data-variant="markers"] &': {
			gridTemplateColumns: '3.5em 1.2em 1fr 3.5em 1.2em 1fr'
		}
	});
	// Gutter cells carry the strong tint (and, in the bars variant, the
	// colored edge bar) so scanning the left edge alone tells the story.
	const lineNo = css({
		px: '2xs',
		textAlign: 'right',
		color: 'neutral.text.muted',
		userSelect: 'none',
		fontVariantNumeric: 'tabular-nums',
		'&[data-kind="added"]': { background: 'success.text.accent/25', color: 'success.text' },
		'&[data-kind="removed"]': { background: 'danger.text.accent/25', color: 'danger.text' },
		'&[data-kind="empty"]': { background: 'neutral.surface.step.2' },
		'[data-variant="bars"] &': {
			'&[data-kind="added"]': {
				boxShadow: 'inset 3px 0 0 0 token(colors.success.text.accent)'
			},
			'&[data-kind="removed"]': {
				boxShadow: 'inset 3px 0 0 0 token(colors.danger.text.accent)'
			}
		}
	});
	// The divider between the two sides of a split row.
	const rightSideStart = css({
		borderLeft: '1px solid',
		borderColor: 'neutral.border.muted'
	});
	const lineMarker = css({
		textAlign: 'center',
		userSelect: 'none',
		fontWeight: 'bold',
		color: 'neutral.text.muted',
		'&[data-kind="added"]': { color: 'success.text' },
		'&[data-kind="removed"]': { color: 'danger.text' }
	});
	// Marker + content cells carry the row wash where the variant asks for
	// one: the full-strength review wash for `background`, a subtle one for
	// `bars`, none for `markers`.
	const cellWash = css({
		'[data-variant="background"] &': {
			'&[data-kind="added"]': { background: 'success.text.accent/15' },
			'&[data-kind="removed"]': { background: 'danger.text.accent/15' }
		},
		'[data-variant="bars"] &': {
			'&[data-kind="added"]': { background: 'success.text.accent/8' },
			'&[data-kind="removed"]': { background: 'danger.text.accent/8' }
		},
		'&[data-kind="empty"]': { background: 'neutral.surface.step.2' }
	});
	const lineContent = css({
		whiteSpace: 'pre',
		pr: 'md',
		'[data-wrap="true"] &': {
			whiteSpace: 'pre-wrap',
			wordBreak: 'break-word',
			minWidth: '0'
		}
	});
	const markedText = css({
		background: 'warning.text.accent/30',
		borderRadius: '2px'
	});
	const annotationRow = css({ fontFamily: 'sans' });

	const MARKERS = { added: '+', removed: '−', context: ' ' } as const;
</script>

<div class={diffBlock} data-testid="diff-viewer">
	<div class={diffScroll}>
		<div
			class={diffRows}
			data-layout={layout}
			data-variant={variant}
			data-gutter={gutter}
			data-wrap={wrap}
		>
			{#each hunks as hunk, hunkIndex (hunk.header + hunk.newStart)}
				{@const gap = gapBefore.get(hunkIndex)}
				{@render gapSection(gap)}
				<!-- Once the gap above is expanded the numbers run continuously,
				     so the hunk header would only interrupt the flow — drop it. -->
				{#if !isFilled(gap)}
					<div class={headerRow} data-testid="diff-hunk-header">
						<span class={stickyContent}>{hunk.header}</span>
					</div>
				{/if}
				{@render blockLines(hunk.lines)}
			{/each}
			{@render gapSection(tailGap)}
		</div>
	</div>
</div>

<!-- A run of diff lines (a hunk's lines or expanded context), rendered in
     the active layout. Highlighting resolves per block. -->
{#snippet blockLines(lines: DiffViewerLine[])}
	{#if layout === 'split'}
		{@const rows = pairLines(lines)}
		{#await highlightLines(lines)}
			{#each rows as row, rowIndex (rowIndex)}
				{@render splitRowFor(row, null)}
			{/each}
		{:then tokens}
			{#each rows as row, rowIndex (rowIndex)}
				{@render splitRowFor(row, tokens)}
			{/each}
		{/await}
	{:else}
		{#await highlightLines(lines)}
			{#each lines as line, lineIndex (lineIndex)}
				{@render unifiedRow(line, null)}
			{/each}
		{:then tokens}
			{#each lines as line, lineIndex (lineIndex)}
				{@render unifiedRow(line, tokens?.[lineIndex] ?? null)}
			{/each}
		{/await}
	{/if}
{/snippet}

<!-- A hidden-context gap: an expander row until clicked, then the real lines
     from the target tree, rendered in place so the blocks around it merge. -->
{#snippet gapSection(gap: import('./diff-gaps').DiffGap | undefined)}
	{#if gap}
		{@const expanded = expandedGaps?.get(gap.id)}
		{#if expanded && expanded.length > 0}
			<div data-testid="diff-expanded-context">
				{@render blockLines(expanded)}
			</div>
		{:else if !expanded}
			<div class={expanderRow} data-testid="diff-gap-expander">
				<span class={stickyContent}>
					<Button
						emphasis="ghost"
						size="xs"
						onclick={() => onExpandGap?.(gap)}
						disabled={loadingGaps?.has(gap.id) ?? false}
						aria-label={gapLabel(gap)}
						data-testid="expand-gap-button"
					>
						{#snippet leading()}
							<Stamp emphasis="ghost" border="none" background="transparent">
								<Icon icon="lucide:chevrons-up-down" width="14px" height="14px" />
							</Stamp>
						{/snippet}
						{loadingGaps?.has(gap.id) ? 'Loading…' : gapLabel(gap)}
					</Button>
					{#if gapErrors?.has(gap.id)}
						<span
							class={css({ color: 'danger.text', fontSize: 'xs' })}
							data-testid="diff-gap-error"
						>
							{gapErrors.get(gap.id)}
						</span>
					{/if}
				</span>
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet unifiedRow(line: DiffViewerLine, tokens: import('shiki').ThemedToken[] | null)}
	<div class={lineRow} data-kind={line.kind} data-testid="diff-line">
		{#if gutter === 'double'}
			<span class={lineNo} data-kind={line.kind}>{line.oldLineNo ?? ''}</span>
			<span class={lineNo} data-kind={line.kind}>{line.newLineNo ?? ''}</span>
		{:else}
			<span class={lineNo} data-kind={line.kind}>{ownLineNo(line)}</span>
		{/if}
		{#if variant === 'markers'}
			<span class={`${lineMarker} ${cellWash}`} data-kind={line.kind} aria-hidden="true"
				>{MARKERS[line.kind]}</span
			>
		{/if}
		{@render lineText(line, tokens)}
	</div>
	{@render annotationFor(line)}
{/snippet}

{#snippet splitRowFor(
	row: import('./split-lines').SplitRow,
	tokens: import('shiki').ThemedToken[][] | null
)}
	{@const leftTokens = tokensAt(tokens, row.leftIndex)}
	{@const rightTokens = tokensAt(tokens, row.rightIndex)}
	<div class={splitRow} data-testid="diff-line">
		{@render sideCells(row.left, leftTokens, false)}
		{@render sideCells(row.right, rightTokens, true)}
	</div>
	{@render annotationFor(row.primary)}
{/snippet}

{#snippet sideCells(
	line: DiffViewerLine | null,
	tokens: import('shiki').ThemedToken[] | null,
	isRight: boolean
)}
	{@const sideStart = isRight ? rightSideStart : ''}
	{#if line}
		<span class={`${lineNo} ${sideStart}`} data-kind={line.kind}>{ownLineNo(line)}</span>
		{#if variant === 'markers'}
			<span class={`${lineMarker} ${cellWash}`} data-kind={line.kind} aria-hidden="true"
				>{MARKERS[line.kind]}</span
			>
		{/if}
		{@render lineText(line, tokens)}
	{:else}
		<span class={`${lineNo} ${sideStart}`} data-kind="empty"></span>
		{#if variant === 'markers'}
			<span class={cellWash} data-kind="empty" aria-hidden="true"></span>
		{/if}
		<span class={`${lineContent} ${cellWash}`} data-kind="empty" data-testid="diff-empty-side"
		></span>
	{/if}
{/snippet}

<!-- Marked runs respect both the token edges (syntax color) and the
     search-match edges (mark wash) at once. With no term this is just the
     tokenized (or plain) line. -->
{#snippet lineText(line: DiffViewerLine, tokens: import('shiki').ThemedToken[] | null)}
	<span class={`${lineContent} ${cellWash}`} data-kind={line.kind}>
		{#each buildMarkedRuns(line.content, tokens, searchTerm) as run, runIndex (runIndex)}
			<span
				style={run.style}
				class={run.marked ? markedText : undefined}
				data-marked={run.marked ? 'true' : undefined}
				role="presentation"
				onmouseenter={() => onTokenHover?.({ content: run.content, line })}>{run.content}</span
			>
		{/each}
	</span>
{/snippet}

{#snippet annotationFor(line: DiffViewerLine)}
	{#if lineAnnotation}
		<div class={annotationRow} data-testid="diff-line-annotation">
			{@render lineAnnotation(line)}
		</div>
	{/if}
{/snippet}
