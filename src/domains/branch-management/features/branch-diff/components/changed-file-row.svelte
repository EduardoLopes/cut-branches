<script lang="ts">
	// One changed file in the diff view: a card header carrying the file's
	// identity (status badge, path, rename source) and its +/− line stats,
	// with a disclosure toggle that expands the actual diff inline. The diff
	// itself is fetched lazily by the panel — collapsed rows cost nothing.
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Card from '@pindoba/svelte-card';
	import Stamp from '@pindoba/svelte-stamp';
	import type { ExplanationDetail } from '../application/use-diff-view-options.svelte';
	import type { FileStructureInfo } from '../models/structure-index';
	import FileDiffPanel from './file-diff-panel.svelte';
	import type { BatchFileState } from '$domains/branch-management/features/diff-explanation/application/use-diff-explanation-batch.svelte';
	import { useFileExplanation } from '$domains/branch-management/features/diff-explanation/application/use-file-explanation.svelte';
	import { useHunkExplanation } from '$domains/branch-management/features/diff-explanation/application/use-hunk-explanation.svelte';
	import ExplanationDetailDropdown from '$domains/branch-management/features/diff-explanation/components/explanation-detail-dropdown.svelte';
	import ExplanationPanel from '$domains/branch-management/features/diff-explanation/components/explanation-panel.svelte';
	import type {
		ChangedFile,
		ExplanationStyle,
		FileChangeStatus,
		SymbolKind
	} from '$infrastructure/bindings';
	import { buildMarkedRuns } from '$ui/patterns/diff-viewer/line-marks';
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
		file: ChangedFile;
		/** Start expanded (e.g. single-file diffs). */
		defaultExpanded?: boolean;
		/** Active search term — matching parts of the file name (and, in the
		 *  panel, of the code) render with a mark wash. */
		searchTerm?: string;
		/** True when the search term was found inside this file's DIFF content
		 *  — the row opens itself so the match is visible. */
		searchMatched?: boolean;
		/** Monotonic navigation signal: every increment (from the file tree)
		 *  opens the row, even if the user collapsed it since the last one. */
		revealSeq?: number;
		/** This file's slice of the diff structure analysis (changed symbols +
		 *  import-impact counts). Undefined while the analysis loads or when it
		 *  failed — the row then renders exactly as before. */
		structure?: FileStructureInfo;
		/** Diff presentation options, passed through to the panel. */
		layout?: DiffViewerLayout;
		variant?: DiffViewerVariant;
		gutter?: DiffViewerGutter;
		wrap?: boolean;
		/** Whether the reviewer has marked this file reviewed. */
		reviewed?: boolean;
		/** Flip this file's reviewed state. */
		onToggleReviewed?: (path: string) => void;
		/** This file's slice of an in-flight "Explain all" batch. When present,
		 *  the explanation panel opens and renders the batch's streamed text
		 *  instead of this row's own on-demand explanation. */
		batchState?: BatchFileState | null;
		/** Reviewer-chosen explanation style, applied to on-demand explanations. */
		explanationStyle?: ExplanationStyle;
		/** Whole-file summary vs per-change inline explanations (header choice). */
		explanationDetail?: ExplanationDetail;
	}

	let {
		repositoryPath,
		branchName = null,
		commitSha = null,
		file,
		defaultExpanded = false,
		searchTerm = '',
		searchMatched = false,
		revealSeq = 0,
		structure = undefined,
		layout = 'unified',
		variant = 'background',
		gutter = 'single',
		wrap = false,
		reviewed = false,
		onToggleReviewed = undefined,
		batchState = null,
		explanationStyle = 'succinct',
		explanationDetail = 'file'
	}: Props = $props();

	let expanded = $state(defaultExpanded);

	// AI explanation of this file's change, streamed from a local CLI agent. The
	// reviewer chooses the granularity up front (header "Detail" control), so a
	// single Explain click runs the intended mode: whole-file (a panel summary)
	// or per-change-group (inline comments anchored under each hunk in the diff).
	const explanationOptions = {
		getPath: () => repositoryPath,
		getBranchName: () => branchName,
		getCommitSha: () => commitSha
	};
	const fileExplanation = useFileExplanation(explanationOptions);
	const hunkExplanation = useHunkExplanation(explanationOptions);
	let explanationOpen = $state(false);
	// Per-file override of the global "Detail" setting: null = follow global.
	let granularityOverride = $state<ExplanationDetail | null>(null);
	const granularity = $derived(granularityOverride ?? explanationDetail);

	function statusOf(exp: {
		isStreaming: boolean;
		error: string | null;
		cancelled: boolean;
		hasRun: boolean;
	}) {
		if (exp.isStreaming) return 'streaming';
		if (exp.error) return 'error';
		if (exp.cancelled) return 'cancelled';
		if (exp.hasRun) return 'done';
		return 'idle';
	}

	const activeStatus = $derived(
		granularity === 'file' ? statusOf(fileExplanation) : statusOf(hunkExplanation)
	);
	const activeError = $derived(
		granularity === 'file' ? fileExplanation.error : hunkExplanation.error
	);
	const activeText = $derived(granularity === 'file' ? fileExplanation.text : hunkExplanation.text);

	// A batch ("Explain all") drives the panel (whole-file) when it has state for
	// this file; otherwise the row's own on-demand explanation does.
	const panelOpen = $derived(explanationOpen || !!batchState);
	const panelGranularity = $derived(batchState ? 'file' : granularity);
	const panelStatus = $derived(batchState ? batchState.status : activeStatus);
	const panelText = $derived(batchState ? batchState.text : activeText);
	const panelError = $derived(batchState ? (batchState.error ?? null) : activeError);
	// Per-change explanations, keyed by hunk number, rendered inline in the diff.
	const hunkExplanationMap = $derived(
		granularity === 'hunks'
			? new Map(hunkExplanation.hunks.map((hunk) => [hunk.index, hunk.text]))
			: undefined
	);

	/** Runs (or re-runs) whichever granularity is active. */
	function runExplanation() {
		const exp = granularity === 'file' ? fileExplanation : hunkExplanation;
		exp.explain(file.path, file.oldPath ?? null, explanationStyle);
	}
	function cancelExplanation() {
		(granularity === 'file' ? fileExplanation : hunkExplanation).cancel();
	}
	function toggleExplanation() {
		explanationOpen = !explanationOpen;
		if (explanationOpen) {
			// Per-change explanations render inline in the diff — reveal it.
			if (granularity === 'hunks') expanded = true;
			const exp = granularity === 'file' ? fileExplanation : hunkExplanation;
			if (!exp.hasRun) runExplanation();
		}
	}
	/** Per-file granularity choice from the dropdown — opens and runs that mode. */
	function setFileDetail(next: ExplanationDetail) {
		granularityOverride = next;
		explanationOpen = true;
		if (next === 'hunks') expanded = true;
		const exp = next === 'file' ? fileExplanation : hunkExplanation;
		if (!exp.hasRun) exp.explain(file.path, file.oldPath ?? null, explanationStyle);
	}

	// A content match opens the row so the hit is visible; the user can still
	// collapse it manually afterwards (the effect only reacts to changes of
	// the match signal, not to the collapse).
	$effect(() => {
		if (searchMatched) {
			expanded = true;
		}
	});

	// Same one-way contract as the search match: each navigation opens the
	// row, manual collapse stays possible until the next one.
	$effect(() => {
		if (revealSeq > 0) {
			expanded = true;
		}
	});

	const pathRuns = $derived(buildMarkedRuns(file.path, null, searchTerm));

	const STATUS_FEEDBACK: Record<FileChangeStatus, 'success' | 'danger' | 'primary' | 'warning'> = {
		added: 'success',
		deleted: 'danger',
		modified: 'primary',
		renamed: 'warning'
	};
	const STATUS_ICON: Record<FileChangeStatus, string> = {
		added: 'lucide:file-plus',
		deleted: 'lucide:file-minus',
		modified: 'lucide:file-pen',
		renamed: 'lucide:file-symlink'
	};

	const pathText = css({
		fontFamily: 'mono',
		fontSize: 'sm',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		direction: 'rtl',
		textAlign: 'left'
	});
	const oldPathText = css({
		fontFamily: 'mono',
		fontSize: 'xs',
		color: 'neutral.text.muted',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	});
	const markedText = css({
		background: 'warning.text.accent/30',
		borderRadius: '2px'
	});

	// --- Structure summary ----------------------------------------------------
	// The analysis names the definitions the hunks touched; the row shows the
	// first few so a reviewer knows WHAT changed before opening the diff.

	const SYMBOL_SUMMARY_LIMIT = 3;
	const SYMBOL_GLYPH: Record<SymbolKind, string> = {
		function: 'ƒ',
		method: 'ƒ',
		class: 'C',
		component: '◇'
	};

	const symbolSummary = $derived.by(() => {
		const symbols = structure?.symbols ?? [];
		if (symbols.length === 0) {
			return null;
		}
		const shown = symbols
			.slice(0, SYMBOL_SUMMARY_LIMIT)
			.map((symbol) => `${SYMBOL_GLYPH[symbol.kind]} ${symbol.name}`)
			.join(', ');
		const more = symbols.length - SYMBOL_SUMMARY_LIMIT;
		return more > 0 ? `${shown} +${more} more` : shown;
	});

	const symbolsText = css({
		fontFamily: 'mono',
		fontSize: 'xs',
		color: 'neutral.text.muted',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	});

	// Reviewed rows recede so unreviewed ones stand out; hovering one restores
	// it so its diff stays legible. Wraps the card so the whole row dims, sticky
	// header included, without disturbing the card's own sticky wiring.
	const reviewedWrapper = css({
		minWidth: '0',
		maxWidth: '100%',
		pindobaTransition: 'fast',
		'&[data-reviewed="true"]': { opacity: '0.5' },
		'&[data-reviewed="true"]:hover': { opacity: '1' }
	});
</script>

{#snippet heading()}
	<span class={css({ display: 'flex', flexDirection: 'column', minWidth: '0', width: '100%' })}>
		<span
			class={css({
				display: 'flex',
				alignItems: 'center',
				gap: 'xs',
				minWidth: '0',
				width: '100%'
			})}
		>
			<span class={css({ flexShrink: '0', display: 'inline-flex' })}>
				<Badge
					size="xs"
					emphasis="secondary"
					feedback={STATUS_FEEDBACK[file.status]}
					data-testid="changed-file-status"
				>
					{#snippet leading()}
						<Stamp emphasis="ghost"><Icon icon={STATUS_ICON[file.status]} /></Stamp>
					{/snippet}
					{file.status}
				</Badge>
			</span>
			<!-- RTL trick: long paths ellipsize at the START so the file name (the
			     part that identifies the change) stays visible. The full path stays
			     available via the title. -->
			<span class={pathText} title={file.path} data-testid="changed-file-path">
				&lrm;{#each pathRuns as run, runIndex (runIndex)}<span
						class={run.marked ? markedText : undefined}
						data-marked={run.marked ? 'true' : undefined}>{run.content}</span
					>{/each}
			</span>
			{#if file.oldPath}
				<span class={oldPathText} title={`Renamed from ${file.oldPath}`}>
					← {file.oldPath}
				</span>
			{/if}
		</span>
		{#if symbolSummary}
			<!-- Which definitions the hunks touched — the "what changed" line. -->
			<span
				class={symbolsText}
				title={structure?.symbols.map((s) => s.name).join(', ')}
				data-testid="changed-file-symbols"
			>
				{symbolSummary}
			</span>
		{/if}
	</span>
{/snippet}

{#snippet headingTrailing()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', flexShrink: '0' })}>
		{#if structure && structure.importsChanged > 0}
			<Badge
				size="xs"
				emphasis="secondary"
				feedback="primary"
				title={`Imports ${structure.importsChanged} changed ${structure.importsChanged === 1 ? 'file' : 'files'}`}
				data-testid="changed-file-imports"
			>
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:arrow-up-right" /></Stamp>
				{/snippet}
				{structure.importsChanged}
			</Badge>
		{/if}
		{#if structure && structure.importedByChanged > 0}
			<Badge
				size="xs"
				emphasis="secondary"
				feedback="primary"
				title={`Imported by ${structure.importedByChanged} changed ${structure.importedByChanged === 1 ? 'file' : 'files'}`}
				data-testid="changed-file-imported-by"
			>
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:arrow-down-left" /></Stamp>
				{/snippet}
				{structure.importedByChanged}
			</Badge>
		{/if}
		{#if file.isBinary}
			<Badge size="xs" emphasis="secondary" feedback="neutral" data-testid="changed-file-binary">
				binary
			</Badge>
		{:else}
			<Badge size="xs" emphasis="secondary" feedback="success" data-testid="changed-file-added">
				+{file.linesAdded}
			</Badge>
			<Badge size="xs" emphasis="secondary" feedback="danger" data-testid="changed-file-removed">
				−{file.linesRemoved}
			</Badge>
		{/if}
		{#if !file.isBinary}
			<span class={css({ display: 'inline-flex', alignItems: 'center' })}>
				<Button
					emphasis="ghost"
					size="xs"
					shape="square"
					feedback={explanationOpen ? 'primary' : undefined}
					onclick={toggleExplanation}
					aria-expanded={explanationOpen}
					aria-label={explanationOpen ? `Hide explanation of ${file.path}` : `Explain ${file.path}`}
					title="Explain this change with your local AI agent"
					data-testid="toggle-file-explanation"
				>
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:sparkles" width="16px" height="16px" />
					</Stamp>
				</Button>
				<ExplanationDetailDropdown detail={granularity} onChange={setFileDetail} />
			</span>
		{/if}
		<Button
			emphasis="ghost"
			size="xs"
			shape="square"
			feedback={reviewed ? 'success' : undefined}
			onclick={() => onToggleReviewed?.(file.path)}
			aria-pressed={reviewed}
			aria-label={reviewed ? `Mark ${file.path} not reviewed` : `Mark ${file.path} reviewed`}
			title={reviewed ? 'Reviewed — click to unmark' : 'Mark reviewed'}
			data-testid="toggle-file-reviewed"
		>
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon
					icon={reviewed ? 'lucide:circle-check-big' : 'lucide:circle'}
					width="16px"
					height="16px"
				/>
			</Stamp>
		</Button>
		<Button
			emphasis="ghost"
			size="xs"
			shape="square"
			onclick={() => (expanded = !expanded)}
			aria-expanded={expanded}
			aria-label={expanded ? `Hide diff of ${file.path}` : `Show diff of ${file.path}`}
			title={expanded ? 'Hide diff' : 'Show diff'}
			data-testid="toggle-file-diff"
		>
			<span
				class={css({
					display: 'inline-flex',
					pindobaTransition: 'fast',
					transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
				})}
			>
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:chevron-down" width="16px" height="16px" />
				</Stamp>
			</span>
		</Button>
	</span>
{/snippet}

{#snippet cardBody()}
	{#if panelOpen}
		<ExplanationPanel
			status={panelStatus}
			text={panelText}
			error={panelError}
			granularity={panelGranularity}
			onExplain={runExplanation}
			onCancel={batchState ? undefined : cancelExplanation}
		/>
	{/if}
	{#if expanded}
		<!-- Constrain the panel to the card's content width so its hunks scroll
		     horizontally in place instead of widening the card/page. -->
		<!-- `clip`, not `hidden`: clipping without becoming a scroll container
		     WebKit could latch wheel gestures onto (see route-vertical-wheel.ts). -->
		<div class={css({ minWidth: '0', maxWidth: '100%', overflow: 'clip' })}>
			<FileDiffPanel
				{repositoryPath}
				{branchName}
				{commitSha}
				{file}
				{searchTerm}
				{layout}
				{variant}
				{gutter}
				{wrap}
				hunkExplanations={hunkExplanationMap}
			/>
		</div>
	{/if}
{/snippet}

<div class={reviewedWrapper} data-reviewed={reviewed ? 'true' : undefined}>
	<Card
		size="xs"
		background="surface.step.2"
		border="muted"
		shadow="none"
		radius="sm"
		data-testid="changed-file-row"
		header={{
			heading: { content: heading, trailing: headingTrailing },
			headingTextStyle: 'body.sm',
			layout: { heading: { trailing: 'apart' } },
			background: 'surface.soft',
			// Let the path shrink/ellipsize instead of overflowing: every Banner
			// wrapper needs min-width: 0, and the trailing badges keep their size.
			// The header also sticks to the top of the scrolling file list while
			// its diff is in view, so long diffs never lose their file identity —
			// z-index keeps it above the diff's own sticky hunk headers.
			passThrough: {
				root: {
					style: css.raw({
						width: '100%',
						minWidth: '0',
						position: 'sticky',
						top: '0',
						zIndex: '2'
					})
				},
				flankRow: { style: css.raw({ width: '100%', minWidth: '0' }) },
				flankGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
				headingGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
				headingContainer: { style: css.raw({ width: '100%', minWidth: '0' }) },
				heading: { style: css.raw({ flex: '1', minWidth: '0', overflow: 'hidden' }) },
				headingTrailing: { style: css.raw({ flexShrink: '0' }) }
			}
		}}
		children={expanded || panelOpen ? cardBody : undefined}
	/>
</div>
