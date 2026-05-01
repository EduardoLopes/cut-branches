<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { Snippet } from 'svelte';
	import CommitCard from './commit-card.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		branch: Branch;
		selected?: boolean;
		locked?: boolean;
		disabled?: boolean;
		colorPalette?: string;
		id?: string;
		title?: string;
		children?: Snippet;
		variant?: 'default' | 'inverted';
	}

	let {
		branch,
		selected = false,
		locked = false,
		disabled = false,
		colorPalette,
		id,
		title,
		children,
		variant = 'default'
	}: Props = $props();

	// In inverted mode, visual state is opposite of selection state
	const isVisuallySelected = $derived(variant === 'inverted' ? !selected : selected);
</script>

<div
	{id}
	{title}
	class={[
		colorPalette,
		css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md',
			borderWidth: '1px',
			borderColor: 'colorPalette.border.muted',
			colorPalette: 'neutral',
			p: 'md',
			gap: 'md',
			background: 'neutral.surface.soft',
			'&.disabled, &.locked': {
				opacity: 0.5,
				pointerEvents: 'none',
				filter: 'grayscale(1)'
			},
			'&.selected': {
				borderColor: 'danger',
				borderStyle: 'dashed'
			},
			'&.current': {
				borderColor: 'primary'
			}
		})
	]}
	class:disabled
	class:locked
	class:current={branch.isCurrent()}
	class:selected={isVisuallySelected}
	data-testid="branch-card"
	data-variant={variant}
>
	<div
		class={[
			css({
				display: 'flex',
				flexDirection: 'column'
			}),
			isVisuallySelected &&
				css({
					color: 'danger'
				})
		]}
	>
		<span
			class={css({
				fontWeight: 600,
				pindobaTransition: 'fast'
			})}
			data-testid="branch-name"
		>
			{branch.getName()}
		</span>
	</div>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			borderRadius: 'md'
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
				color: 'neutral.text.muted',
				fontWeight: 'bold'
			})}
		>
			<Icon
				icon="lucide:git-commit-horizontal"
				width="16px"
				height="16px"
				color={token('colors.neutral.text.muted')}
			/> Last commit
		</div>
		<CommitCard commit={branch.getLastCommit()} />
	</div>

	{#if branch.getDeletedAt()}
		{@const deletedAt = branch.getDeletedAt()!}
		<div
			class={css({
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'flex-end',
				gap: '2xs',
				fontSize: 'sm',
				color: 'danger.text',
				pt: 'xs',
				borderTopWidth: '1px',
				borderTopColor: 'neutral.border.muted'
			})}
			data-testid="deleted-at-info"
		>
			<Icon icon="lucide:trash" width="16px" height="16px" />
			<span title={safeFormatDate(deletedAt)} data-testid={`deleted-at-title-${branch.getName()}`}>
				Deleted {safeFormatRelativeDate(deletedAt)}
			</span>
		</div>
	{/if}

	{#if children}
		{@render children()}
	{/if}
</div>
