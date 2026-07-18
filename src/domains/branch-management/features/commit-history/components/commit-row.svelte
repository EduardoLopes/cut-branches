<script lang="ts">
	// A single commit row: gutter cell (branch decision surface), graph rail
	// slice, and the commit info as a compact two-line Banner — message on
	// top; sha, non-local ref badges, author, and relative date stacked
	// underneath — so the rail keeps most of the horizontal space.
	import Icon from '@iconify/svelte';
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import BranchGutterCell from './branch-gutter-cell.svelte';
	import GraphRailCell from './graph-rail-cell.svelte';
	import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
	import type {
		GraphRow,
		RunBelow
	} from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { safeFormatRelativeDate } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		row: GraphRow;
		laneCount: number;
		size?: number;
		/** Clipped rail viewport width (shared with the run rows + scrollbar). */
		railW?: number;
		signals: (name: string) => BranchSignals | undefined;
		isSelected: (name: string) => boolean;
		isSelectable: (name: string) => boolean;
		onToggle: (name: string) => void;
		onCenterLane?: (lane: number) => void;
		/** Foldable run hanging below this row — renders the gutter toggle. */
		runBelow?: RunBelow;
		onToggleRun?: (groupId: string) => void;
	}

	let {
		row,
		laneCount,
		size = 48,
		railW = 260,
		signals,
		isSelected,
		isSelectable,
		onToggle,
		onCenterLane,
		runBelow,
		onToggleRun
	}: Props = $props();

	// Left gutter: run-toggle column + the branch decision surface (pinned
	// local branches + signals).
	const gutterCol = css({
		flex: '0 0 auto',
		width: '240px',
		display: 'flex',
		alignItems: 'stretch',
		overflow: 'hidden',
		borderRight: '1px solid token(colors.neutral.border.muted)'
	});
	// Narrow leading column holding the run expand/collapse toggle. Present on
	// every row so branch names stay aligned.
	const toggleCol = css({
		flex: '0 0 auto',
		width: '28px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		borderRight: '1px solid token(colors.neutral.border.muted)'
	});
	const toggleBtn = css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '2xs',
		px: '2xs',
		py: '2xs',
		borderRadius: 'sm',
		cursor: 'pointer',
		color: 'neutral.text.muted',
		fontSize: 'xs',
		lineHeight: '1',
		_hover: {
			color: 'neutral.text',
			background: 'neutral.surface.step.3'
		}
	});
	const gutterInner = css({
		flex: '1',
		minWidth: '0',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'center',
		gap: '2xs',
		px: 'sm',
		overflow: 'hidden'
	});
	const infoCol = css({
		flex: '1',
		minWidth: '0',
		display: 'flex',
		alignItems: 'center',
		px: 'sm',
		overflow: 'hidden'
	});
	// Heading line: message flexes and truncates; the date trails at the edge.
	// Long titles must never push the date out: every wrapper the Banner puts
	// between the row and the message needs `min-width: 0` for the ellipsis
	// to engage.
	const headingRow = css.raw({
		display: 'flex',
		alignItems: 'center',
		gap: 'sm',
		minWidth: '0',
		width: '55ch',
		overflow: 'hidden',
		'& > *': { minWidth: '0' }
	});
	// Pin the trailing date to the right edge of the heading line.
	const dateTrailing = css({
		marginLeft: 'auto',
		flex: '0 0 auto'
	});
	// Message content: single line, truncated. Head rows read slightly louder.
	const messageHead = css({
		flex: '1',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		fontWeight: 'medium',
		color: 'neutral.text'
	});
	const messageMuted = css({
		flex: '1',
		minWidth: '0',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		color: 'neutral.text.muted'
	});
	// Meta line under the message: sha (leading) · badges · author.
	const subheadingRow = css.raw({
		display: 'flex',
		alignItems: 'center',
		gap: 'xs',
		justifyContent: 'flex-start',
		minWidth: '0',
		overflow: 'hidden'
	});
	const shaCode = css({
		fontSize: 'xs',
		color: 'neutral.text.muted',
		flex: '0 0 auto',
		fontFamily: 'mono'
	});
	const badgeBase = css({
		fontSize: 'xs',
		px: '2xs',
		borderRadius: 'sm',
		flex: '0 0 auto',
		whiteSpace: 'nowrap',
		display: 'inline-flex',
		alignItems: 'center',
		gap: '2xs',
		border: '1px solid',
		borderColor: 'neutral.border.muted',
		background: 'neutral.surface.step.1',
		color: 'neutral.text.muted'
	});
	const metaText = css({
		fontSize: 'xs',
		color: 'neutral.text.muted',
		flex: '0 1 auto',
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis'
	});
</script>

{#snippet sha()}
	<code class={shaCode}>{row.commit.shortSha}</code>
{/snippet}

{#snippet message()}
	<span class={row.isBranchHead ? messageHead : messageMuted} title={row.commit.message}>
		{row.commit.message}
	</span>
{/snippet}

{#snippet meta()}
	{#each row.commit.refs.filter((r) => r.kind !== 'localBranch') as ref (ref.kind + ref.name)}
		<span class={badgeBase}>
			{#if ref.kind === 'tag'}
				<Stamp emphasis="ghost" border="none" background="transparent">
					<Icon icon="lucide:tag" width="11px" height="11px" />
				</Stamp>
			{/if}
			{ref.name}
		</span>
	{/each}
{/snippet}

{#snippet author()}
	<span class={metaText}>{row.commit.author}</span>
{/snippet}

{#snippet date()}
	<span class={`${metaText} ${dateTrailing}`}>
		{safeFormatRelativeDate(row.commit.date, { unit: 'day' })}
	</span>
{/snippet}

<div class={gutterCol}>
	<div class={toggleCol}>
		{#if runBelow && onToggleRun}
			{@const label = runBelow.collapsed
				? `Show ${runBelow.count} commits`
				: `Hide ${runBelow.count} commits`}
			<Tooltip content={label}>
				{#snippet children(triggerProps)}
					<button
						type="button"
						class={toggleBtn}
						aria-label={label}
						aria-expanded={!runBelow.collapsed}
						onclick={() => onToggleRun(runBelow.groupId)}
						{...triggerProps}
					>
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon
								icon={runBelow.collapsed ? 'lucide:chevrons-up-down' : 'lucide:chevrons-down-up'}
								width="14px"
								height="14px"
							/>
						</Stamp>
						{#if runBelow.collapsed}
							<span>{runBelow.count}</span>
						{/if}
					</button>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
	<div class={gutterInner}>
		{#if row.isBranchHead}
			<BranchGutterCell {row} {signals} {isSelected} {isSelectable} {onToggle} />
		{/if}
	</div>
</div>

<GraphRailCell {row} {laneCount} {size} {railW} {onCenterLane} />

<div class={infoCol}>
	<Banner
		size="xs"
		heading={{ content: message, trailing: date } as BannerProps['heading']}
		headingTextStyle="body.sm"
		subheadingTextStyle="body.sm"
		subheading={{ leading: sha, content: meta, trailing: author } as BannerProps['subheading']}
		layout={{
			heading: {
				trailing: 'apart'
			},
			subheading: {
				trailing: 'apart'
			}
		}}
		passThrough={{
			root: { style: css.raw({ width: '100%', minWidth: '0' }) },
			heading: { style: headingRow },
			subheading: { style: subheadingRow },
			headingContainer: { style: css.raw({ width: '100%' }) },
			subheadingContainer: { style: css.raw({ width: '100%' }) }
		}}
	/>
</div>
