<script lang="ts">
	// The left gutter cell for a branch-head row — the DECISION surface of the
	// history view. Reuses the shared BranchCard in its compact density for the
	// branch identity (name, current badge, selected/locked visuals — the same
	// card the branches screen and delete modal render), pairs it with a
	// checkbox that writes into the shared cache-backed selection the
	// DeleteBranchModal consumes, and threads the history-specific cleanup
	// signals (ahead/behind/merged vs the base) into the card's footer badge
	// row, next to where the branches screen shows its diff badges.
	//
	// When several local branches point at the same commit, the first is shown
	// with a "+N more" pill that opens a popover listing every branch.
	import Badge from '@pindoba/svelte-badge';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Popover from '@pindoba/svelte-popover';
	import { page } from '$app/state';
	import type { Branch } from '$domains/branch-management/core/models/branch';
	import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
	import type { GraphRow } from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositorySubPath } from '$lib/repository-route';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		row: GraphRow;
		/** Branch domain model from the shared branches cache; undefined while
		 *  the cache loads or when the ref is unknown to it. */
		getBranch: (name: string) => Branch | undefined;
		signals: (name: string) => BranchSignals | undefined;
		isSelected: (name: string) => boolean;
		isSelectable: (name: string) => boolean;
		onToggle: (name: string) => void;
	}

	let { row, getBranch, signals, isSelected, isSelectable, onToggle }: Props = $props();

	// Anchor for the overflow popover. Bound explicitly so positioning never
	// depends on attachment-spread mechanics on a plain button.
	let morePillEl = $state<HTMLElement | null>(null);

	const names = $derived(
		row.commit.refs.filter((r) => r.kind === 'localBranch').map((r) => r.name)
	);
	const extra = $derived(names.length - 1);

	// Per-branch deep-link into the diff review view (branch vs merge-base
	// with HEAD), gated by its own flag. The owning repo id comes from the
	// route — this component only renders inside `/repos/[id]/history`. The
	// current branch diffs against itself, so it gets no link.
	function diffHrefFor(branch: Branch | undefined, name: string): string | undefined {
		if (!isFeatureEnabled('branch-diff') || !page.params.id || branch?.isCurrent()) {
			return undefined;
		}
		return `${resolveRepositorySubPath(page.params.id, 'diff')}?branch=${encodeURIComponent(name)}`;
	}

	// Branch row = [checkbox | compact BranchCard] flex row; the checkbox sits
	// beside the card, mirroring the branches screen's layout. Start-aligned
	// so the checkbox tracks the card's header (name) line.
	const branchRow = css({ display: 'flex', alignItems: 'flex-start', gap: 'xs', minWidth: '0' });
	const cardHost = css({ flex: '1', minWidth: '0' });
	// Identity fallback while the branches cache hasn't resolved this name —
	// the checkbox is inert then too (isSelectable is cache-backed).
	const nameFallback = css({
		display: 'block',
		fontWeight: 600,
		fontSize: 'sm',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	});
	// Signal badges + overflow pill, laid out as a wrapping left-aligned row.
	const badgeRow = css({
		display: 'flex',
		alignItems: 'center',
		gap: '2xs',
		flexWrap: 'wrap'
	});
	// Extra, symmetric breathing room for branch rows inside the popover.
	const popoverItemPad = css({ p: 'sm' });
	const popoverList = css({
		display: 'flex',
		flexDirection: 'column',
		gap: '2xs',
		minWidth: '280px',
		maxHeight: '320px',
		overflowY: 'auto'
	});
	// "+N" pill that opens the overflow-branches popover.
	const morePill = css({
		flex: '0 0 auto',
		fontSize: 'xs',
		color: 'accent.text',
		background: 'transparent',
		border: 'none',
		cursor: 'pointer',
		whiteSpace: 'nowrap',
		px: '0',
		_hover: { textDecoration: 'underline' }
	});
</script>

<!-- Semantic signal badges: ahead = added (success), behind = missing (danger),
     merged = neutral — secondary emphasis, matching the card's own badges. -->
{#snippet signalBadges(cmp: BranchSignals)}
	{#if cmp.ahead === 0}
		<Badge size="xs" emphasis="secondary" feedback="neutral" data-testid="signal-merged">
			merged
		</Badge>
	{:else}
		<Badge size="xs" emphasis="secondary" feedback="success" data-testid="signal-ahead">
			{cmp.ahead}↑
		</Badge>
	{/if}
	{#if cmp.behind > 0}
		<Badge size="xs" emphasis="secondary" feedback="danger" data-testid="signal-behind">
			{cmp.behind}↓
		</Badge>
	{/if}
{/snippet}

{#snippet branchGutterRow(name: string, padded: boolean, withOverflow: boolean)}
	{@const branch = getBranch(name)}
	{@const cmp = signals(name)}
	{@const showMore = withOverflow && extra > 0}
	{@const hasBody = !!cmp || showMore}
	{#snippet signalsRow()}
		<span class={badgeRow}>
			{#if cmp}{@render signalBadges(cmp)}{/if}
			{#if showMore}
				<button bind:this={morePillEl} type="button" class={morePill} data-popover-trigger>
					+{extra} more
				</button>
				<Popover
					triggerElement={morePillEl}
					placement="bottom-start"
					triggerStrategy="click"
					autoFocus={false}
				>
					<div class={popoverList}>
						{#each names as overflowName (overflowName)}
							{@render branchGutterRow(overflowName, true, false)}
						{/each}
					</div>
				</Popover>
			{/if}
		</span>
	{/snippet}
	{@const isCurrent = branch?.isCurrent() ?? false}
	<div class={`${branchRow} ${padded ? popoverItemPad : ''}`}>
		{#if !isCurrent}
			<Checkbox
				size="md"
				checked={isSelected(name)}
				disabled={!isSelectable(name)}
				onchange={() => onToggle(name)}
				aria-label={name}
				title={name}
			/>
		{/if}
		<!-- The current branch can never be deleted, so it gets no checkbox and
		     its card fills the whole row instead. -->
		<div class={cardHost}>
			{#if branch}
				<!-- Snippet only when it renders something — an empty snippet
				     would still force the footer's badge row. -->
				<BranchCard
					{branch}
					compact
					selected={isSelected(name)}
					locked={branch.getIsLocked() && !branch.isCurrent()}
					title={name}
					diffHref={diffHrefFor(branch, name)}
					footerBadges={hasBody ? signalsRow : undefined}
				/>
			{:else}
				<span class={nameFallback} title={name}>{name}</span>
				{#if hasBody}{@render signalsRow()}{/if}
			{/if}
		</div>
	</div>
{/snippet}

{#if row.isBranchHead && names.length > 0}
	{@render branchGutterRow(names[0], false, true)}
{/if}
