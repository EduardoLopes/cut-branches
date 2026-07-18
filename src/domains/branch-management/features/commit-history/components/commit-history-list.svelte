<script lang="ts">
	// The virtualized commit list: renders display items (commit rows,
	// collapsed runs, run headers) through TanStack Virtual, drives
	// infinite-scroll paging, reports the visible branch heads for lazy
	// comparisons, pans every row's rail via ONE shared horizontal scrollbar
	// (a CSS custom property — zero re-renders), and resolves deep-link
	// reveals into a scroll + transient highlight.
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import { tick } from 'svelte';
	import { get } from 'svelte/store';
	import CommitRow from './commit-row.svelte';
	import CommitRunRow from './commit-run-row.svelte';
	import { laneColorVar } from './lane-colors';
	import type { useCommitHistoryView } from '$domains/branch-management/features/commit-history/application/use-commit-history-view.svelte';
	import { findDisplayIndex } from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		view: ReturnType<typeof useCommitHistoryView>;
	}

	let { view }: Props = $props();

	const ROW_H = 48;
	// Run rows (Show/Hide N commits) are compact divider strips, not full rows.
	const RUN_H = 32;
	// Lane spacing. Wider now that horizontal scroll absorbs the extra width.
	const CELL = 24;
	// Fixed rail viewport width — lanes beyond it are clipped and reached via
	// the shared horizontal scrollbar, so they never bleed over the commit
	// text. The commit info is a compact two-line banner, so the graph gets
	// most of the horizontal space.
	const RAIL_W = 380;
	const HIGHLIGHT_MS = 2500;

	let scrollElement = $state<HTMLDivElement | null>(null);
	let scrollbarEl = $state<HTMLDivElement | null>(null);

	const fullLaneWidth = $derived((view.laneCount + 1) * CELL);
	const laneX = (lane: number) => lane * CELL + CELL / 2;

	/** Pan every rail together without touching Svelte state: one CSS custom
	 *  property on the scroll container. */
	function onRailScroll(event: Event) {
		const left = (event.currentTarget as HTMLDivElement).scrollLeft;
		scrollElement?.style.setProperty('--rail-scroll-x', `${left}px`);
	}

	/** Scroll the rail so `lane` sits in the middle of the viewport. */
	function centerLane(lane: number) {
		const target = Math.max(0, Math.min(laneX(lane) - RAIL_W / 2, fullLaneWidth - RAIL_W));
		if (scrollbarEl) scrollbarEl.scrollTo({ left: target, behavior: 'smooth' });
		else scrollElement?.style.setProperty('--rail-scroll-x', `${target}px`);
	}

	// Run rows are shorter than commit rows, so sizes are per-index.
	const estimateSize = (index: number) => (view.display[index]?.t === 'commit' ? ROW_H : RUN_H);

	const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
		count: 0,
		getScrollElement: () => scrollElement,
		estimateSize,
		overscan: 16
	});

	$effect(() => {
		// Keep the virtualizer's count and scroll element in sync. get() reads
		// the store without subscribing, so setOptions doesn't re-trigger this.
		const count = view.display.length;
		const instance = get(virtualizer);
		instance.setOptions({
			count,
			getScrollElement: () => scrollElement,
			estimateSize,
			overscan: 16
		});
		// Expanding/collapsing a run shifts row types across indices; drop the
		// cached per-index measurements so heights are re-estimated.
		instance.measure();
	});

	const virtualItems = $derived($virtualizer.getVirtualItems());

	$effect(() => {
		// Load-more when the viewport approaches the tail of what's loaded. Map
		// the last visible display row back to its underlying commit index.
		const last = virtualItems.at(-1);
		const item = last ? view.display[last.index] : undefined;
		if (item) view.loadMoreIfNeeded(item.lastCommitIndex);
	});

	$effect(() => {
		// Report the branch heads currently in view — feeds the lazy
		// ahead/behind comparison batches.
		const names: string[] = [];
		for (const virtualItem of virtualItems) {
			const item = view.display[virtualItem.index];
			if (item?.t !== 'commit' || !item.row.isBranchHead) continue;
			for (const ref of item.row.commit.refs) {
				if (ref.kind === 'localBranch') names.push(ref.name);
			}
		}
		view.visibleBranchNames = names;
	});

	$effect(() => {
		// Resolve a pending deep-link reveal: expand the collapsed run hiding
		// the target if needed, then scroll to its display row and highlight it.
		const reveal = view.pendingReveal;
		if (!reveal) return;

		const location = findDisplayIndex(view.display, reveal.commitIndex);
		if (!location) return; // rows still folding in; effect reruns on display change

		if (location.t === 'collapsed') {
			view.expandGroup(location.groupId); // display changes → effect reruns
			return;
		}

		const displayIndex = location.displayIndex;
		void tick().then(() => {
			get(virtualizer).scrollToIndex(displayIndex, { align: 'center' });
			view.completeReveal();
		});
	});

	$effect(() => {
		// The deep-link highlight is transient.
		if (!view.highlightSha) return;
		const timer = setTimeout(() => view.clearHighlight(), HIGHLIGHT_MS);
		return () => clearTimeout(timer);
	});

	// Commit rows are no longer interactible as a whole (the checkbox and the
	// run strips are the only click targets), so they carry no hover.
	const rowBaseRaw = css.raw({
		display: 'flex',
		alignItems: 'stretch',
		borderBottom: '1px solid',
		borderColor: 'neutral.border.muted'
	});
	const rowBase = css(rowBaseRaw);
	// Collapsed/header rows are clickable as a whole, so they keep a hover. The
	// floating pill's own hairline is the divider, so the row skips its bottom
	// border.
	const rowRun = css(rowBaseRaw, {
		cursor: 'pointer',
		borderBottom: 'none',
		_hover: { background: 'neutral.surface.step.2' }
	});
	// Local-branch head rows — the deletion candidates — get a raised surface
	// and an accent spine so the eye can compare tips at a glance.
	const rowHead = css({
		background: 'neutral.surface.step.2',
		boxShadow: 'inset 3px 0 0 0 token(colors.accent.border.muted)'
	});
	// Deep-link target: a brief highlight in the branch's OWN lane color (spine +
	// outline + soft wash) so the user recognizes which branch they landed on.
	// The color is per-row and dynamic, so it's applied inline (see the loop);
	// this transition just makes it fade in/out like the old accent outline.
	const highlightTransition = 'box-shadow 0.4s ease, background 0.4s ease';
	const scrollHost = css({ flex: '1', overflow: 'auto', position: 'relative' });
	const railScrollbar = css({
		position: 'sticky',
		bottom: '0',
		left: '0',
		ml: '240px',
		zIndex: '1',
		height: '14px',
		overflowX: 'auto',
		overflowY: 'hidden',
		background: 'neutral.surface.step.1',
		borderTop: '1px solid token(colors.neutral.border.muted)'
	});
	const loadingFooter = css({
		position: 'sticky',
		bottom: '0',
		textAlign: 'center',
		py: 'xs',
		fontSize: 'xs',
		color: 'neutral.text.muted',
		background: 'neutral.surface.step.1'
	});
</script>

<div bind:this={scrollElement} class={scrollHost} data-testid="commit-history-list">
	<div style={`height:${$virtualizer.getTotalSize()}px;width:100%;position:relative;`}>
		{#each virtualItems as virtualRow (virtualRow.key)}
			{@const item = view.display[virtualRow.index]}
			{@const rowStyle = `position:absolute;top:0;left:0;width:100%;height:${virtualRow.size}px;transform:translateY(${virtualRow.start}px);`}
			{#if item?.t === 'commit'}
				{@const highlighted = !!view.highlightSha && item.row.commit.sha === view.highlightSha}
				{@const headClass = item.row.isBranchHead ? rowHead : ''}
				{@const laneColor = laneColorVar(item.row.nodeColorLane)}
				{@const highlightStyle = highlighted
					? `box-shadow:inset 3px 0 0 0 ${laneColor},inset 0 0 0 2px ${laneColor};background:color-mix(in srgb, ${laneColor} 12%, transparent);transition:${highlightTransition};`
					: ''}
				<div style={`${rowStyle}${highlightStyle}`} class={`${rowBase} ${headClass}`}>
					<CommitRow
						row={item.row}
						laneCount={view.laneCount}
						size={virtualRow.size}
						railW={RAIL_W}
						signals={(name) => view.comparisons.get(name)}
						isSelected={view.isSelected}
						isSelectable={view.isSelectable}
						onToggle={view.toggleBranchSelection}
						onCenterLane={centerLane}
						runBelow={item.runBelow}
						onToggleRun={view.toggleGroup}
					/>
				</div>
			{:else if item?.t === 'collapsed' || item?.t === 'header'}
				{@const groupId = item.groupId}
				<!-- The WHOLE run row is the expand/collapse control. -->
				<div
					style={rowStyle}
					class={rowRun}
					role="button"
					tabindex="0"
					onclick={() => view.toggleGroup(groupId)}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							view.toggleGroup(groupId);
						}
					}}
				>
					<CommitRunRow mode={item.t} count={item.count} />
				</div>
			{/if}
		{/each}
	</div>

	{#if fullLaneWidth > RAIL_W}
		<!-- Shared horizontal scrollbar for the rail: one control pans every
		     row's lanes together via the --rail-scroll-x custom property. -->
		<div
			bind:this={scrollbarEl}
			class={railScrollbar}
			style={`width:${RAIL_W}px;`}
			onscroll={onRailScroll}
		>
			<div style={`width:${fullLaneWidth}px;height:1px;`}></div>
		</div>
	{/if}

	{#if view.isFetchingNextPage}
		<div class={loadingFooter}>Loading…</div>
	{/if}
</div>
