<script lang="ts">
	// The left gutter cell for a branch-head row — the DECISION surface of the
	// history view. Shows the branch name with its cleanup signals
	// (ahead/behind/merged vs the base) and a checkbox that writes into the
	// shared cache-backed selection the DeleteBranchModal consumes.
	//
	// When several local branches point at the same commit, the first is shown
	// with a "+N more" pill that opens a popover listing every branch.
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Popover from '@pindoba/svelte-popover';
	import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
	import type { GraphRow } from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		row: GraphRow;
		signals: (name: string) => BranchSignals | undefined;
		isSelected: (name: string) => boolean;
		isSelectable: (name: string) => boolean;
		onToggle: (name: string) => void;
	}

	let { row, signals, isSelected, isSelectable, onToggle }: Props = $props();

	// Anchor for the overflow popover. Bound explicitly so positioning never
	// depends on attachment-spread mechanics on a plain button.
	let morePillEl = $state<HTMLElement | null>(null);

	const names = $derived(
		row.commit.refs.filter((r) => r.kind === 'localBranch').map((r) => r.name)
	);
	const extra = $derived(names.length - 1);

	// Branch row = Checkbox(fullWidth) wrapping a [name | badges] flex row.
	const gutterBranch = css({
		alignItems: 'center',
		borderRadius: 'sm',
		px: '2xs',
		py: '2xs',
		cursor: 'pointer',
		_hover: { background: 'neutral.surface.step.3' }
	});
	// Truncate the branch name (Banner heading) in the gutter; popover has room.
	const headingTruncate = css.raw({
		display: 'block',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		width: '18ch'
	});
	// Badges live in the subheading, laid out as a left-aligned row.
	const subheadingRow = css.raw({
		display: 'flex',
		alignItems: 'center',
		gap: '2xs',
		justifyContent: 'flex-start'
	});
	// Extra, symmetric breathing room for branch rows inside the popover.
	const popoverItemPad = css({ p: 'sm' });
	const popoverList = css({
		display: 'flex',
		flexDirection: 'column',
		gap: '2xs',
		minWidth: '220px',
		maxHeight: '320px',
		overflowY: 'auto'
	});
	// Semantic signal badges: ahead = added (success), behind = missing (danger).
	const sigBadge = css({
		fontSize: 'xs',
		lineHeight: '1.3',
		px: '2xs',
		borderRadius: 'sm',
		border: '1px solid',
		flex: '0 0 auto',
		whiteSpace: 'nowrap'
	});
	// Secondary emphasis: soft surface + muted border, not a loud solid fill.
	const sigAheadCls = css({
		background: 'success.surface.soft',
		color: 'success.text',
		borderColor: 'success.border.muted'
	});
	const sigBehindCls = css({
		background: 'danger.surface.soft',
		color: 'danger.text',
		borderColor: 'danger.border.muted'
	});
	const sigMergedCls = css({
		background: 'neutral.surface.step.2',
		color: 'neutral.text.muted',
		borderColor: 'neutral.border.muted',
		fontStyle: 'italic'
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

{#snippet signalBadges(cmp: BranchSignals)}
	{#if cmp.ahead === 0}
		<span class={`${sigBadge} ${sigMergedCls}`}>merged</span>
	{:else}
		<span class={`${sigBadge} ${sigAheadCls}`}>{cmp.ahead}↑</span>
	{/if}
	{#if cmp.behind > 0}<span class={`${sigBadge} ${sigBehindCls}`}>{cmp.behind}↓</span>{/if}
{/snippet}

{#snippet branchRow(name: string, padded: boolean, withOverflow: boolean)}
	{@const cmp = signals(name)}
	{@const showMore = withOverflow && extra > 0}
	{@const hasSub = !!cmp || showMore}
	{#snippet subheading()}
		{#if cmp}{@render signalBadges(cmp)}{/if}
		{#if showMore}
			<button
				bind:this={morePillEl}
				type="button"
				class={morePill}
				data-popover-trigger
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
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
						{@render branchRow(overflowName, true, false)}
					{/each}
				</div>
			</Popover>
		{/if}
	{/snippet}
	<Checkbox
		fullWidth
		size="md"
		checked={isSelected(name)}
		disabled={!isSelectable(name)}
		onchange={() => onToggle(name)}
		aria-label={name}
		title={name}
		class={`${gutterBranch} ${padded ? popoverItemPad : ''}`}
		passThrough={{ text: { style: css.raw({ flex: '1', minWidth: '0' }) } }}
	>
		<Banner
			size="xs"
			heading={name}
			headingTextStyle="body.sm"
			subheadingTextStyle="body.sm"
			subheading={hasSub ? (subheading as BannerProps['subheading']) : undefined}
			passThrough={{
				root: { style: css.raw({ width: '100%' }) },
				heading: padded ? undefined : { style: headingTruncate },
				subheading: { style: subheadingRow }
			}}
		/>
	</Checkbox>
{/snippet}

{#if row.isBranchHead && names.length > 0}
	{@render branchRow(names[0], false, true)}
{/if}
