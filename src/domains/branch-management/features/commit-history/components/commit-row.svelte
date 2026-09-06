<script lang="ts">
	// A single commit row: gutter cell (branch decision surface), graph rail
	// slice, and the commit info rendered by the shared commit card in its
	// compact density. Ref decorations the card doesn't model (tags, extra
	// remotes) are threaded in through the card's footer-badges slot.
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import BranchGutterCell from './branch-gutter-cell.svelte';
	import GraphRailCell from './graph-rail-cell.svelte';
	import { page } from '$app/state';
	import type { Branch } from '$domains/branch-management/core/models/branch';
	import type { BranchSignals } from '$domains/branch-management/features/commit-history/application/use-branch-comparisons.svelte';
	import type {
		GraphRow,
		RunBelow
	} from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { toCommit } from '$domains/branch-management/features/commit-history/models/to-commit';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositorySubPath } from '$lib/repository-route';
	import CommitCard from '$ui/core/commit-card.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		row: GraphRow;
		laneCount: number;
		size?: number;
		/** Clipped rail viewport width (shared with the run rows + scrollbar). */
		railW?: number;
		signals: (name: string) => BranchSignals | undefined;
		/** Branch domain model from the shared branches cache; undefined while
		 *  the cache loads or when the ref is unknown to it. */
		getBranch: (name: string) => Branch | undefined;
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
		getBranch,
		isSelected,
		isSelectable,
		onToggle,
		onCenterLane,
		runBelow,
		onToggleRun
	}: Props = $props();

	// The history graph carries a plain `HistoryCommit` (raw ISO date, no
	// dedicated summary field); lift it into the `Commit` domain model the
	// shared commit card expects.
	const commit = $derived(toCommit(row.commit));
	// Per-commit deep-link into the diff review view (commit vs its parent),
	// gated by its own flag. The owning repo id comes from the route — this
	// component only renders inside `/repos/[id]/history`.
	const diffHref = $derived(
		isFeatureEnabled('branch-diff') && page.params.id
			? `${resolveRepositorySubPath(page.params.id, 'diff')}?commit=${row.commit.sha}`
			: undefined
	);
	// Remote tracking ref (if the commit is decorated with one), passed as the
	// card's upstream. The card hides it by default — showing the upstream is
	// the branch card's job — but it stays available should rows opt in later.
	const upstream = $derived(row.commit.refs.find((r) => r.kind === 'remoteBranch')?.name ?? null);
	// Remaining decorations the card doesn't model — tags and any further remote
	// refs beyond the upstream one. Local branches stay in the gutter.
	const extraRefs = $derived(
		row.commit.refs.filter((r) => r.kind !== 'localBranch' && r.name !== upstream)
	);

	// Left gutter: run-toggle column + the branch decision surface (pinned
	// local branches + signals). Wide enough for the compact branch card with
	// its upstream + signal footer; the commit info column (flex) gives up the
	// space. Must match the rail scrollbar's margin in commit-history-list.
	const gutterCol = css({
		flex: '0 0 auto',
		width: '320px',
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
		alignItems: 'stretch',
		justifyContent: 'stretch',
		borderRight: '1px solid token(colors.neutral.border.muted)'
	});
	// pindoba's passThrough escape hatch — merged into the button's css() call
	// AFTER the recipe, so these keys win. Makes the ghost button fill the
	// 28px toggle column exactly (flush against the cell dividers) and drops
	// the border entirely: the recipe reserves a 1px border whose color
	// appears on hover for ghost buttons; zero width removes it at rest AND
	// on hover.
	const toggleBtnStyle = css.raw({
		width: 'full',
		height: 'full',
		minWidth: '0',
		flexDirection: 'column',
		gap: '2xs',
		px: '0',
		py: '2xs',
		borderWidth: '0',
		borderRadius: '0',
		fontSize: 'xs',
		lineHeight: '1',
		// Ghost buttons surface a border color on hover/active — pin the
		// panel's border var transparent in both states as well.
		_hover: { '--panel-self-border-color': 'transparent' },
		_active: { '--panel-self-border-color': 'transparent' }
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
					<Button
						type="button"
						emphasis="ghost"
						size="xs"
						border="none"
						passThrough={{ root: { style: toggleBtnStyle } }}
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
					</Button>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
	<div class={gutterInner}>
		{#if row.isBranchHead}
			<BranchGutterCell {row} {getBranch} {signals} {isSelected} {isSelectable} {onToggle} />
		{/if}
	</div>
</div>

<GraphRailCell {row} {laneCount} {size} {railW} {onCenterLane} />

<div class={infoCol}>
	<CommitCard
		{commit}
		{upstream}
		{diffHref}
		density="compact"
		footerBadges={extraRefs.length ? refBadges : undefined}
	/>
</div>

{#snippet tagStamp()}
	<Stamp emphasis="ghost"><Icon icon="lucide:tag" /></Stamp>
{/snippet}

{#snippet refBadges()}
	{#each extraRefs as ref (ref.kind + ref.name)}
		<Badge
			size="xs"
			emphasis="secondary"
			leading={ref.kind === 'tag' ? tagStamp : undefined}
			data-testid="commit-ref"
		>
			<span title={ref.name}>{ref.name}</span>
		</Badge>
	{/each}
{/snippet}
