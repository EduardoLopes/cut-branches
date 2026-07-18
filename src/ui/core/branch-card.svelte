<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Card, {
		type PrimitiveCardFooterProps,
		type PrimitiveCardHeaderProps,
		type PrimitiveCardProps
	} from '@pindoba/svelte-card';
	import type { Snippet } from 'svelte';
	import CommitCard from './commit-card.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		branch: Branch;
		/** Dense layout: a tighter card with a single-line ellipsized branch name
		 *  and the last commit rendered as a compact one-line row (no "Last
		 *  commit" section label). For space-constrained contexts (e.g. modals
		 *  and status lists) where the full card is too tall. Mirrors the
		 *  CommitCard `compact` mode. */
		compact?: boolean;
		/** Whether to render the upstream badge in the header. On by default —
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
		commitHoverPreview
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
		...(isVisuallySelected ? { borderStyle: 'dashed' } : {}),
		...(disabled || locked
			? { opacity: 0.5, pointerEvents: 'none' as const, filter: 'grayscale(1)' }
			: {})
	});

	// Compact density: a tighter Card size and smaller badge/meta type. Same
	// content and semantics as the default card — only scaled down, mirroring
	// CommitCard's compact mode. `xs` is a native, tight padding preset.
	const cardSize = $derived<PrimitiveCardProps['size']>(compact ? 'xs' : undefined);
	const badgeSize = $derived(compact ? 'xs' : 'sm');
	const metaFont = $derived(compact ? 'xs' : 'sm');
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
				<span class={css({ display: 'inline-flex', alignItems: 'center', gap: '2xs' })}>
					<Icon icon="lucide:map-pin" width="12px" height="12px" />
					current
				</span>
			</Badge>
		{/if}
		{#if showUpstream && branch.getUpstream()}
			<!-- The upstream is a branch attribute, so it lives here on the branch
			     header rather than on the embedded commit card's footer. -->
			<Badge size={badgeSize} emphasis="secondary" {feedback} data-testid="branch-upstream">
				<span
					class={css({ display: 'inline-flex', alignItems: 'center', gap: '2xs' })}
					title={branch.getUpstream()}
				>
					<Icon icon="lucide:git-branch" width="12px" height="12px" />
					{branch.getUpstream()}
				</span>
			</Badge>
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
	<CommitCard
		commit={branch.getLastCommit()}
		{compact}
		{feedback}
		historyHref={commitHistoryHref}
		hoverPreview={commitHoverPreview}
	/>
{/snippet}

<Card
	{id}
	{title}
	{feedback}
	size={cardSize}
	border="default"
	class={rootClass}
	data-testid="branch-card"
	data-variant={variant}
	passThrough={{ root: { style: rootStyle } }}
	header={{
		heading: heading as PrimitiveCardHeaderProps['heading'],
		...(compact ? { headingTextStyle: 'body.sm' } : {})
	}}
	footer={branch.getDeletedAt()
		? { trailing: deletedAtInfo as PrimitiveCardFooterProps['trailing'] }
		: undefined}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: compact ? 'xs' : 'md'
		})}
	>
		{#if compact}
			<!-- Dense mode: the compact commit card is already a one-line row, so
			     the "Last commit" section chrome (label + step-2 panel) would cost
			     more height than the content it frames. Render the row bare. -->
			{@render lastCommitCard()}
		{:else}
			<div
				class={css({
					display: 'flex',
					flexDirection: 'column',
					borderRadius: 'lg',
					gap: 'xs',
					background: 'colorPalette.surface.step.2',
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
</Card>
