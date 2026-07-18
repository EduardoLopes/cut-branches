<script lang="ts">
	// A single commit row: gutter cell (branch decision surface), graph rail
	// slice, and the commit info rendered by the shared commit card in its
	// compact density. Ref decorations the card doesn't model (tags, extra
	// remotes) are threaded in through the card's footer-badges slot.
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import BranchGutterCell from './branch-gutter-cell.svelte';
	import GraphRailCell from './graph-rail-cell.svelte';
	import { Commit } from '$domains/branch-management/core/models/commit';
	import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
	import type {
		GraphRow,
		RunBelow
	} from '$domains/branch-management/features/commit-history/models/commit-graph';
	import CommitCard from '$ui/core/commit-card.svelte';
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

	// The history graph carries a plain `HistoryCommit` (raw ISO date, no
	// dedicated summary field). Lift it into the `Commit` domain model the shared
	// commit card expects, deriving the subject line from the message.
	const commit = $derived(
		Commit.fromData({
			sha: row.commit.sha,
			shortSha: row.commit.shortSha,
			date: row.commit.date,
			message: row.commit.message,
			summary: row.commit.message.split('\n', 1)[0],
			author: row.commit.author,
			email: row.commit.email
		})
	);
	// Surface a remote tracking ref (if the commit is decorated with one) as the
	// card's upstream badge.
	const upstream = $derived(row.commit.refs.find((r) => r.kind === 'remoteBranch')?.name ?? null);
	// Remaining decorations the card doesn't model — tags and any further remote
	// refs beyond the one shown as upstream. Local branches stay in the gutter.
	const extraRefs = $derived(
		row.commit.refs.filter((r) => r.kind !== 'localBranch' && r.name !== upstream)
	);

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
		overflow: 'hidden',
		// Divider on the right edge of the graph rail, matching the gutter columns.
		borderLeft: '1px solid token(colors.neutral.border.muted)'
	});
</script>

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
	<CommitCard {commit} {upstream} compact footerBadges={extraRefs.length ? refBadges : undefined} />
</div>

{#snippet refBadges()}
	{#each extraRefs as ref (ref.kind + ref.name)}
		<Badge size="xs" emphasis="secondary" data-testid="commit-ref">
			<span
				class={css({ display: 'inline-flex', alignItems: 'center', gap: '2xs' })}
				title={ref.name}
			>
				{#if ref.kind === 'tag'}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:tag" width="11px" height="11px" />
					</Stamp>
				{/if}
				{ref.name}
			</span>
		</Badge>
	{/each}
{/snippet}
