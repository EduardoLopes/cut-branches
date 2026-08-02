<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Card, {
		type PrimitiveCardFooterProps,
		type PrimitiveCardHeaderProps,
		type PrimitiveCardProps
	} from '@pindoba/svelte-card';
	import Panel from '@pindoba/svelte-panel';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import CommitCard from './commit-card.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		branch: Branch;
		/** Dense layout: a tighter card reduced to the branch identity — name,
		 *  state badges, and footer meta — with the last commit omitted
		 *  entirely. For space-constrained contexts (e.g. modals and status
		 *  lists) where the full card is too tall. Mirrors the CommitCard
		 *  `compact` mode. */
		compact?: boolean;
		/** Whether to render the upstream badge in the footer. On by default —
		 *  showing the upstream is the branch card's job (CommitCard's mirror
		 *  prop defaults to off) — but contexts that already convey the remote
		 *  ref can opt out. Branches without an upstream get an explicit
		 *  neutral "no upstream" badge instead of nothing. */
		showUpstream?: boolean;
		/** Line-level diff of the branch against its merge-base with HEAD,
		 *  rendered as +added/−removed badges in the footer. Fetched by the
		 *  consumer (it's live git data, not a branch attribute) and omitted
		 *  on error or for branches where it's meaningless (current, deleted).
		 *  A 0/0 diff renders as a neutral "no diff" badge — zeros aren't
		 *  good/bad news, and collapsing it after the fetch would shift the
		 *  layout. */
		diffStats?: { linesAdded: number; linesRemoved: number };
		/** True while the consumer is still fetching `diffStats`. Renders
		 *  placeholder badges that reserve the footer space, so the card
		 *  doesn't shift when the numbers land. */
		diffStatsLoading?: boolean;
		/** Extra badges appended to the footer's trailing row, after the diff
		 *  badges (e.g. the history view's ahead/behind cleanup signals).
		 *  Mirrors CommitCard's `footerBadges`. Forces the footer to render
		 *  even when nothing else occupies it. */
		footerBadges?: Snippet;
		selected?: boolean;
		locked?: boolean;
		disabled?: boolean;
		colorPalette?: string;
		id?: string;
		title?: string;
		children?: Snippet;
		variant?: 'default' | 'inverted';
		/** Forwarded to the embedded CommitCard: deep-link into a history view. */
		commitHistoryHref?: string;
		/** Forwarded to the embedded CommitCard: deep-link into a diff view of
		 *  the last commit (vs its parent). Only surfaces once the commit panel
		 *  is expanded — the collapsed mini row has no footer to host it. */
		commitDiffHref?: string;
		/** Deep-link into a diff view of this branch (its changes vs the current
		 *  branch); rendered as a file-diff icon link in the footer, beside the
		 *  diff-stat badges. Pre-resolved by the consumer — this generic card
		 *  knows nothing about the app's route table. */
		diffHref?: string;
		/** Forwarded to the embedded CommitCard: hover/focus preview content. */
		commitHoverPreview?: Snippet;
		/** Deeper detail for the "Last commit" panel, revealed by a "More"
		 *  toggle: typically the branch's preceding commits. Rendered only while
		 *  expanded, so a consumer that mounts a query in here fetches lazily —
		 *  nothing loads until someone asks. This card owns the toggle, the
		 *  region, and the animation; it knows nothing about what's inside. */
		recentCommits?: Snippet;
		/** Fired when the user hovers or focuses the "More" toggle — i.e. signals
		 *  intent to expand, before the snippet mounts. A consumer whose
		 *  `recentCommits` mounts a query uses this to prefetch it, so expanding
		 *  usually lands on cache instead of a spinner. Purely advisory: the card
		 *  works identically without it. */
		onRecentCommitsIntent?: () => void;
		/** Card surface props, forwarded to the underlying pindoba Card so this
		 *  component can be reused on different backgrounds/contexts (mirrors
		 *  CommitCard). Defaults match the standalone branch-list look; `size`
		 *  is overridden to `xs` in compact mode. */
		size?: PrimitiveCardProps['size'];
		background?: PrimitiveCardProps['background'];
		border?: PrimitiveCardProps['border'];
		shadow?: PrimitiveCardProps['shadow'];
		radius?: PrimitiveCardProps['radius'];
	}

	let {
		branch,
		compact = false,
		showUpstream = true,
		diffStats,
		diffStatsLoading = false,
		footerBadges,
		selected = false,
		locked = false,
		disabled = false,
		colorPalette,
		id,
		title,
		children,
		variant = 'default',
		commitHistoryHref,
		commitDiffHref,
		diffHref,
		commitHoverPreview,
		recentCommits,
		onRecentCommitsIntent,
		size,
		background = 'surface.step.2',
		border = 'muted',
		shadow,
		radius
	}: Props = $props();

	// In inverted mode, visual state is opposite of selection state
	const isVisuallySelected = $derived(variant === 'inverted' ? !selected : selected);

	// Map branch state onto the Card's semantic feedback surface: current →
	// primary border, (visually) selected → danger border, otherwise neutral.
	const feedback = $derived(
		branch.isCurrent() ? 'primary' : isVisuallySelected ? 'danger' : 'neutral'
	);

	// Keep the state marker classes (+ consumer colorPalette) on the root so
	// existing state hooks and tests keep working; the actual visuals come from
	// the Card feedback/border props above.
	const rootClass = $derived(
		[
			colorPalette,
			isVisuallySelected && 'selected',
			branch.isCurrent() && 'current',
			locked && 'locked',
			disabled && 'disabled'
		]
			.filter(Boolean)
			.join(' ')
	);

	// Card has no dashed-border or disabled/locked-dimming variants, so express
	// those through the root passThrough style.
	const rootStyle = $derived({
		overflow: 'hidden',
		...(isVisuallySelected ? { borderStyle: 'dashed' } : {}),
		...(disabled || locked
			? { opacity: 0.5, pointerEvents: 'none' as const, filter: 'grayscale(1)' }
			: {})
	});

	// Compact density: a tighter Card size and smaller badge/meta type. Same
	// content and semantics as the default card — only scaled down, mirroring
	// CommitCard's compact mode. `xs` is a native, tight padding preset.
	const cardSize = $derived<PrimitiveCardProps['size']>(compact ? 'xs' : size);
	const badgeSize = $derived(compact ? 'xs' : 'sm');
	const metaFont = $derived(compact ? 'xs' : 'sm');

	// Disclosure state for the recent-commits region. Collapsed on mount: the
	// panel's job is to stay out of the way until asked.
	let recentExpanded = $state(false);
	// Whether the region's content is in the DOM. Tracks `recentExpanded` on the
	// way in, but lags it on the way out: unmounting the moment the toggle flips
	// would leave an empty box to collapse, so the content would vanish and only
	// the (now invisible) height would animate. Holding it through the
	// transition is what makes the close read as a close.
	let recentMounted = $state(false);
	let recentUnmountTimer: ReturnType<typeof setTimeout> | undefined;
	const RECENT_COLLAPSE_MS = 260;

	function toggleRecentCommits() {
		clearTimeout(recentUnmountTimer);
		recentExpanded = !recentExpanded;
		if (recentExpanded) {
			recentMounted = true;
		} else {
			recentUnmountTimer = setTimeout(() => (recentMounted = false), RECENT_COLLAPSE_MS);
		}
	}

	// A card can be destroyed mid-collapse (the branch list refetches, the modal
	// closes); the pending unmount must not outlive it.
	$effect(() => () => clearTimeout(recentUnmountTimer));

	// Ties the toggle to the region it controls. Scoped by branch name so two
	// cards on the same page never collide.
	const recentRegionId = $derived(`recent-commits-${branch.getName()}`);

	// Both header labels occupy the same grid cell, so the box sizes to the
	// longer of the two and nothing reflows when they swap.
	const labelStack = css({
		display: 'grid',
		alignItems: 'center',
		justifyItems: 'start'
	});

	// One layer per word. `both` variants differ only in which way the word
	// leaves, which is what turns a crossfade into a roll: `labelUp` exits
	// upward (expanding), `labelDown` exits downward (collapsing), so the pair
	// always travels in the same direction as the disclosure. Properties are
	// enumerated rather than `all` — the blanket form would also animate the
	// colour the theme toggle changes. The incoming word is delayed slightly so
	// the two don't overlap into mush at the midpoint.
	const labelLayer = {
		gridArea: '1 / 1',
		whiteSpace: 'nowrap' as const,
		opacity: 0,
		filter: 'blur(3px)',
		transition:
			'opacity 200ms cubic-bezier(0.2, 0, 0, 1), transform 260ms cubic-bezier(0.2, 0, 0, 1), filter 200ms cubic-bezier(0.2, 0, 0, 1)',
		'&[data-visible="true"]': {
			opacity: 1,
			filter: 'blur(0)',
			transform: 'translateY(0)',
			transitionDelay: '70ms'
		},
		_motionReduce: {
			transition: 'none',
			filter: 'none',
			transform: 'none'
		}
	};
	const labelUp = css({ ...labelLayer, transform: 'translateY(-0.6em)' });
	const labelDown = css({ ...labelLayer, transform: 'translateY(0.6em)' });

	// The footer hosts the upstream badge (leading) and the diff-stat badges
	// plus deleted-at meta (trailing); it only renders when at least one of
	// them is present. With `showUpstream` on, the leading slot always renders
	// — either the upstream ref or a neutral "no upstream" badge.
	const upstreamShown = $derived(showUpstream);
	// Data present OR still loading — the loading placeholder claims the same
	// footprint as the resolved badges, so the footer never appears/reflows
	// when the async diff lands. The diff deep-link shares the trailing row.
	const diffShown = $derived(Boolean(diffStats) || diffStatsLoading || Boolean(diffHref));

	// Truncation kit for the footer's upstream badges: the badge shrinks with
	// the footer instead of overflowing it, and its label ellipsizes.
	const truncatingBadgePassThrough = {
		root: { style: css.raw({ maxWidth: '100%', minWidth: '0' }) },
		content: { style: css.raw({ minWidth: '0', overflow: 'hidden' }) }
	};
	const badgeLabelTruncate = css({
		display: 'block',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap',
		// The badge content slot zeroes line-height; text normally overflows
		// that zero-height line box visibly, but with overflow hidden it would
		// be clipped away — restore a real one.
		lineHeight: '1.2'
	});
</script>

{#snippet heading()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
		<span
			class={css({
				fontWeight: 600,
				pindobaTransition: 'fast',
				minWidth: '0',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			})}
			title={branch.getName()}
			data-testid="branch-name"
		>
			{branch.getName()}
		</span>
		{#if branch.isCurrent()}
			<!-- The badge never shrinks — in tight contexts the name ellipsizes
			     instead, so the branch identity always stays visible. -->
			<span class={css({ flexShrink: '0', display: 'inline-flex' })}>
				<Badge
					size={badgeSize}
					feedback="primary"
					emphasis="secondary"
					data-testid="branch-current-badge"
				>
					{#snippet leading()}
						<Stamp emphasis="ghost"><Icon icon="lucide:map-pin" /></Stamp>
					{/snippet}
					current
				</Badge>
			</span>
		{/if}
	</span>
{/snippet}

<!-- Footer meta: the upstream ref as a badge, mirroring how the commit card
     surfaces its SHA/upstream in a dedicated footer row. The upstream is a
     branch attribute, so it lives on the branch card's footer rather than on
     the embedded commit card's. -->
{#snippet footerMeta()}
	<!-- Both badges are capped to the footer width and their labels ellipsize
	     (never overlapping the trailing badges); the full value stays available
	     via the title. `overflow: hidden` on the container guarantees nothing
	     ever paints over the trailing side, whatever the squeeze. -->
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs',
			minWidth: '0',
			maxWidth: '100%',
			overflow: 'hidden'
		})}
	>
		{#if branch.getUpstream()}
			<Badge
				size={badgeSize}
				emphasis="secondary"
				{feedback}
				data-testid="branch-upstream"
				passThrough={truncatingBadgePassThrough}
			>
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:git-branch" /></Stamp>
				{/snippet}
				<span class={badgeLabelTruncate} title={branch.getUpstream()}>
					{branch.getUpstream()}
				</span>
			</Badge>
		{:else}
			<!-- Local-only branch: state it explicitly rather than omitting the
			     badge — an absent badge reads as "unknown", not "none". -->
			<Badge
				size={badgeSize}
				emphasis="secondary"
				feedback="neutral"
				title="No remote tracking branch configured"
				data-testid="branch-no-upstream"
				passThrough={truncatingBadgePassThrough}
			>
				{#snippet leading()}
					<Stamp emphasis="ghost"><Icon icon="lucide:cloud-off" /></Stamp>
				{/snippet}
				<span class={badgeLabelTruncate}>no upstream</span>
			</Badge>
		{/if}
	</span>
{/snippet}

<!-- Trailing footer meta: the diff badges and (when applicable) the deleted-at
     info share the footer's right edge; the upstream badge keeps the left. -->
{#snippet footerTrailing()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', flexWrap: 'wrap' })}>
		{#if diffStats && (diffStats.linesAdded > 0 || diffStats.linesRemoved > 0)}
			{@const added = diffStats.linesAdded}
			{@const removed = diffStats.linesRemoved}
			<span
				class={css({ display: 'flex', alignItems: 'center', gap: '2xs' })}
				title={`${added} line${added === 1 ? '' : 's'} added, ${removed} line${removed === 1 ? '' : 's'} removed vs current branch`}
				data-testid="branch-diff-stats"
			>
				<Badge
					size={badgeSize}
					emphasis="secondary"
					feedback="success"
					data-testid="branch-diff-added"
				>
					+{added}
				</Badge>
				<Badge
					size={badgeSize}
					emphasis="secondary"
					feedback="danger"
					data-testid="branch-diff-removed"
				>
					−{removed}
				</Badge>
			</span>
		{:else if diffStats}
			<!-- Empty diff: a single neutral badge instead of green/red zeros —
			     zeros aren't good or bad news, and the badge keeps the footer
			     occupied so nothing reflows. -->
			<Badge
				size={badgeSize}
				emphasis="secondary"
				feedback="neutral"
				title="No line changes vs current branch"
				data-testid="branch-diff-none"
			>
				no diff
			</Badge>
		{:else if diffStatsLoading}
			<!-- Same badge pair with dash placeholders: identical height and a
			     close-enough width, so the resolved numbers replace it without
			     any layout shift. Dimmed to read as pending, not as data. -->
			<span
				class={css({ display: 'flex', alignItems: 'center', gap: '2xs', opacity: 0.45 })}
				title="Computing diff vs current branch…"
				aria-busy="true"
				data-testid="branch-diff-stats-loading"
			>
				<Badge size={badgeSize} emphasis="secondary" feedback="neutral">+–</Badge>
				<Badge size={badgeSize} emphasis="secondary" feedback="neutral">−–</Badge>
			</span>
		{/if}
		{#if branch.getDeletedAt()}
			{@render deletedAtInfo()}
		{/if}
		{@render footerBadges?.()}
		{#if diffHref}
			<!-- LAST in the trailing row so the diff button always hugs the
			     card's right edge — same spot on every card, whatever badges
			     precede it. The href arrives pre-resolved from the composing
			     domain (this generic card must not know the app's route table). -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				href={diffHref}
				class={css({
					display: 'flex',
					alignItems: 'center',
					color: 'neutral.text.muted',
					pindobaTransition: 'fast',
					_hover: { color: 'accent.text' }
				})}
				aria-label="View branch diff"
				title="View branch diff"
				data-testid="branch-diff-link"
			>
				<Stamp
					emphasis="ghost"
					border="muted"
					size={compact ? 'xs' : 'sm'}
					background="transparent"
				>
					<Icon
						icon="lucide:file-diff"
						width={compact ? '14px' : '16px'}
						height={compact ? '14px' : '16px'}
					/>
				</Stamp>
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/if}
	</span>
{/snippet}

{#snippet deletedAtInfo()}
	{@const deletedAt = branch.getDeletedAt()!}
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: '2xs',
			fontSize: metaFont,
			color: 'danger.text'
		})}
		data-testid="deleted-at-info"
	>
		<Icon
			icon="lucide:trash"
			width={compact ? '14px' : '16px'}
			height={compact ? '14px' : '16px'}
		/>
		<span title={safeFormatDate(deletedAt)} data-testid={`deleted-at-title-${branch.getName()}`}>
			Deleted {safeFormatRelativeDate(deletedAt)}
		</span>
	</span>
{/snippet}

{#snippet lastCommitCard()}
	<!-- Collapsed, the commit is a supporting line: a nested card here reads as
	     a second object and dominates the branch list, so `mini` strips it to
	     one row. Expanding promotes it to the same compact card the commits
	     below use — that is where its description body, SHA and diff link live,
	     and where the panel becomes a uniform list rather than a line with a
	     list stapled underneath. Keyed to `recentExpanded` (not the mount flag)
	     so the promotion runs with the height animation, not after it. -->
	<CommitCard
		commit={branch.getLastCommit()}
		{feedback}
		density={recentExpanded ? 'compact' : 'mini'}
		radius="inner"
		historyHref={commitHistoryHref}
		diffHref={commitDiffHref}
		hoverPreview={commitHoverPreview}
	/>
{/snippet}

{#snippet cardChildren()}
	<!-- `minWidth: 0` all the way down to the commit row: the mini row is a
	     single nowrap line, and a flex item won't shrink below its content
	     without it — the summary's ellipsis never engages and the line bleeds
	     out past the card instead. -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: compact ? 'xs' : 'md',
			minWidth: '0'
		})}
	>
		{#if !compact}
			<!-- `radius="inner"` derives this well's corner from the Card's own
			     radius minus its content inset, so the well stays concentric with
			     whatever `radius`/`size` the consumer gave the card. -->
			<Panel
				{feedback}
				background="surface.deep"
				radius="inner"
				padding="xs"
				class={css({
					display: 'flex',
					flexDirection: 'column',
					gap: 'xs',
					minWidth: '0'
				})}
			>
				<div
					class={css({
						fontSize: 'xs',
						textTransform: 'uppercase',
						display: 'flex',
						flexDirection: 'row',
						alignItems: 'center',
						gap: '2xs',
						pindobaTransition: 'fast',
						color: 'colorPalette.text.muted',
						fontWeight: 'bold'
					})}
				>
					<Icon
						icon="lucide:git-commit-horizontal"
						width="16px"
						height="16px"
						color={token('colors.colorPalette.text.muted')}
					/>
					<!-- The header follows the disclosure: collapsed the panel really
					     does hold just the tip, expanded it holds the branch's recent
					     history. The word swap runs inside the height animation, so it
					     reads as part of the same motion rather than as a jump.
					     Both labels stay mounted and stacked in one grid cell: the box
					     is therefore as wide as the longer word in both states, so the
					     More button never shifts under the cursor mid-click. -->
					<span
						class={labelStack}
						data-expanded={recentExpanded}
						data-label={recentExpanded ? 'Recent commits' : 'Last commit'}
						data-testid="commit-panel-label"
					>
						<!-- Odometer, not a crossfade: each word has a fixed exit
						     direction, so expanding rolls the text upward and collapsing
						     rolls it back down. The pair reads as one strip moving rather
						     than as two words dissolving into each other. The hidden layer
						     is aria-hidden so the label is announced once. -->
						<span class={labelUp} data-visible={!recentExpanded} aria-hidden={recentExpanded}>
							Last commit
						</span>
						<span class={labelDown} data-visible={recentExpanded} aria-hidden={!recentExpanded}>
							Recent commits
						</span>
					</span>

					{#if recentCommits}
						<!-- Pushed to the panel's trailing edge so the label reads as a
						     label and the control as a control. -->
						<span class={css({ marginLeft: 'auto', textTransform: 'none' })}>
							<Button
								emphasis="ghost"
								size="xs"
								{feedback}
								onclick={toggleRecentCommits}
								onmouseenter={onRecentCommitsIntent}
								onfocus={onRecentCommitsIntent}
								aria-expanded={recentExpanded}
								aria-controls={recentRegionId}
								title={recentExpanded
									? 'Hide earlier commits'
									: 'Show earlier commits on this branch'}
								data-testid="toggle-recent-commits"
							>
								{recentExpanded ? 'Less' : 'More'}
								{#snippet trailing()}
									<span
										class={css({
											display: 'inline-flex',
											pindobaTransition: 'fast',
											transform: recentExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
										})}
									>
										<Stamp emphasis="ghost" border="none" background="transparent">
											<Icon icon="lucide:chevron-down" width="14px" height="14px" />
										</Stamp>
									</span>
								{/snippet}
							</Button>
						</span>
					{/if}
				</div>

				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						gap: 'xs',
						minWidth: '0'
					})}
				>
					{@render lastCommitCard()}
				</div>

				{#if recentCommits}
					<!-- Height animation via `grid-template-rows: 0fr → 1fr`: it
					     interpolates without knowing the content's height, so the
					     region can hold a list that arrives asynchronously. The inner
					     element must clip (`overflow: hidden; min-height: 0`) or the
					     content spills out of the collapsed track. Properties are
					     enumerated rather than `all` — a blanket transition here would
					     also animate the colours the theme toggle changes. -->
					<div
						id={recentRegionId}
						class={css({
							display: 'grid',
							gridTemplateRows: '0fr',
							opacity: 0,
							transition:
								'grid-template-rows 260ms cubic-bezier(0.2, 0, 0, 1), opacity 180ms cubic-bezier(0.2, 0, 0, 1)',
							'&[data-expanded="true"]': {
								gridTemplateRows: '1fr',
								opacity: 1
							},
							_motionReduce: { transition: 'none' }
						})}
						data-expanded={recentExpanded}
						data-testid="recent-commits-region"
					>
						<div class={css({ overflow: 'hidden', minHeight: '0' })}>
							<!-- Not mounted until first expanded: a consumer that runs a
							     query in here therefore fetches on first open, not on page
							     load. -->
							{#if recentMounted}
								<div class={css({ paddingTop: 'xs' })}>
									{@render recentCommits()}
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</Panel>
		{/if}

		{#if children}
			{@render children()}
		{/if}
	</div>
{/snippet}

<Card
	{id}
	{title}
	{feedback}
	size={cardSize}
	{background}
	{border}
	{shadow}
	{radius}
	class={rootClass}
	data-testid="branch-card"
	data-variant={variant}
	passThrough={{ root: { style: rootStyle } }}
	header={{
		heading: heading as PrimitiveCardHeaderProps['heading'],
		background: 'surface.soft',
		...(compact ? { headingTextStyle: 'body.sm' } : {}),
		// Let the branch name shrink so its ellipsis engages in narrow hosts
		// (e.g. the history gutter). The Banner nests the heading through
		// several flank/group wrappers; every one needs `min-width: 0` — a
		// flex item won't shrink below content size otherwise.
		passThrough: {
			root: { style: css.raw({ width: '100%', minWidth: '0' }) },
			flankRow: { style: css.raw({ width: '100%', minWidth: '0' }) },
			flankGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
			headingGroup: { style: css.raw({ width: '100%', minWidth: '0' }) },
			headingContainer: { style: css.raw({ width: '100%', minWidth: '0' }) },
			heading: { style: css.raw({ minWidth: '0', overflow: 'hidden' }) }
		}
	}}
	footer={upstreamShown || diffShown || branch.getDeletedAt() || footerBadges
		? {
				...(diffShown || upstreamShown || footerBadges ? { background: 'surface.step.3' } : {}),
				...(upstreamShown ? { children: footerMeta } : {}),
				...(diffShown || branch.getDeletedAt() || footerBadges
					? { trailing: footerTrailing as PrimitiveCardFooterProps['trailing'] }
					: {}),
				// The upstream (leading) side absorbs the squeeze and ellipsizes;
				// the trailing badges keep their intrinsic size.
				passThrough: {
					footer: { style: css.raw({ minWidth: '0' }) },
					trailing: { style: css.raw({ flexShrink: '0' }) }
				}
			}
		: undefined}
	children={!compact || children ? cardChildren : undefined}
/>
<!-- The body is withheld (not just emptied) when there is nothing to show:
     Card renders its padded content region whenever `children` is truthy, so
     an empty snippet would still cost a padded block. Consumers must follow
     the same contract — pass `children` only when it will render something
     (see branch-list's conditional `children={hasAlerts ? ... : undefined}`),
     because Svelte cannot detect that a snippet's output is empty. -->
