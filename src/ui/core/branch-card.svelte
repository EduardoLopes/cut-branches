<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Card, {
		type PrimitiveCardFooterProps,
		type PrimitiveCardHeaderProps,
		type PrimitiveCardProps
	} from '@pindoba/svelte-card';
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
		 *  ref can opt out. */
		showUpstream?: boolean;
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
		/** Forwarded to the embedded CommitCard: hover/focus preview content. */
		commitHoverPreview?: Snippet;
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
		selected = false,
		locked = false,
		disabled = false,
		colorPalette,
		id,
		title,
		children,
		variant = 'default',
		commitHistoryHref,
		commitHoverPreview,
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

	// The footer hosts the upstream badge (leading) and the deleted-at meta
	// (trailing); it only renders when at least one of them is present.
	const upstreamShown = $derived(Boolean(showUpstream && branch.getUpstream()));
</script>

{#snippet heading()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
		<span
			class={css({
				fontWeight: 600,
				pindobaTransition: 'fast',
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			})}
			data-testid="branch-name"
		>
			{branch.getName()}
		</span>
		{#if branch.isCurrent()}
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
		{/if}
	</span>
{/snippet}

<!-- Footer meta: the upstream ref as a badge, mirroring how the commit card
     surfaces its SHA/upstream in a dedicated footer row. The upstream is a
     branch attribute, so it lives on the branch card's footer rather than on
     the embedded commit card's. -->
{#snippet footerMeta()}
	<span
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs',
			flexWrap: 'wrap'
		})}
	>
		<Badge size={badgeSize} emphasis="secondary" {feedback} data-testid="branch-upstream">
			{#snippet leading()}
				<Stamp emphasis="ghost"><Icon icon="lucide:git-branch" /></Stamp>
			{/snippet}
			<span title={branch.getUpstream()}>
				{branch.getUpstream()}
			</span>
		</Badge>
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
	<CommitCard
		commit={branch.getLastCommit()}
		{feedback}
		historyHref={commitHistoryHref}
		hoverPreview={commitHoverPreview}
	/>
{/snippet}

{#snippet cardChildren()}
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: compact ? 'xs' : 'md'
		})}
	>
		{#if !compact}
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					borderRadius: 'lg',
					gap: 'xs',
					background: 'colorPalette.surface.deep',
					padding: 'xs'
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
					/> Last commit
				</div>

				<!--
					Commit list. Currently the backend only exposes the branch's last
					commit, so this renders a single CommitCard. It is a column so that,
					once the backend returns more commits, this becomes a `{#each}` over
					them plus a "show more" control without restructuring the layout.
				-->
				<div
					class={css({
						display: 'flex',
						flexDirection: 'column',
						gap: 'xs'
					})}
				>
					{@render lastCommitCard()}
				</div>
			</div>
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
		...(compact ? { headingTextStyle: 'body.sm' } : {})
	}}
	footer={upstreamShown || branch.getDeletedAt()
		? {
				...(upstreamShown ? { children: footerMeta, background: 'surface.step.3' } : {}),
				...(branch.getDeletedAt()
					? { trailing: deletedAtInfo as PrimitiveCardFooterProps['trailing'] }
					: {})
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
