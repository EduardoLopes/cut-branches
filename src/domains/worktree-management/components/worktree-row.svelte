<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Card, { type PrimitiveCardHeaderProps } from '@pindoba/svelte-card';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { type Worktree } from '../core/models/worktree';
	import { css } from '@pindoba/styled-system/css';
	import { token } from '@pindoba/styled-system/tokens';

	interface Props {
		worktree: Worktree;
		/** Whether this worktree is currently selected for a bulk action. */
		selected?: boolean;
	}

	let { worktree, selected = false }: Props = $props();

	// The badge shows the branch name, or "detached" when HEAD isn't on a branch.
	// The short SHA is shown separately (whenever HEAD resolves) so every worktree
	// with a HEAD displays it consistently.
	const branchLabel = $derived(worktree.getBranch() ?? 'detached');
	// Mirror branch-card's semantic border: main → primary, selected → danger
	// (dashed), locked → warning, prunable → danger, otherwise neutral. Selection
	// takes precedence so a selected worktree reads the same as a selected branch.
	const feedback = $derived(
		worktree.isMain()
			? 'primary'
			: selected
				? 'danger'
				: worktree.isLocked()
					? 'warning'
					: worktree.isPrunable()
						? 'danger'
						: 'neutral'
	);

	// Card has no dashed-border or locked-dimming variants, so express those
	// through the root passThrough style, mirroring branch-card: selected →
	// dashed border, locked → dimmed + desaturated.
	const rootStyle = $derived({
		...(selected ? { borderStyle: 'dashed' } : {}),
		...(worktree.isLocked() && !worktree.isMain() ? { opacity: 0.5, filter: 'grayscale(1)' } : {})
	});
</script>

{#snippet nameContent()}
	<span class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
		<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
			<Icon icon={worktree.isMain() ? 'lucide:house' : 'lucide:trees'} width="16px" height="16px" />
		</Stamp>
		<span
			class={css({
				fontWeight: 600,
				overflow: 'hidden',
				textOverflow: 'ellipsis',
				whiteSpace: 'nowrap'
			})}
			data-testid="worktree-name"
		>
			{worktree.getName()}
		</span>
		{#if worktree.isMain()}
			<Badge size="sm" emphasis="secondary" data-testid="worktree-main-badge">main</Badge>
		{/if}
		{#if worktree.isLocked()}
			<Tooltip content={worktree.getLockReason() ?? 'Locked'}>
				{#snippet children(triggerProps)}
					<Badge {...triggerProps} size="sm" feedback="warning" data-testid="worktree-locked-badge">
						locked
					</Badge>
				{/snippet}
			</Tooltip>
		{/if}
		{#if worktree.isPrunable()}
			<Badge size="sm" feedback="danger" data-testid="worktree-prunable-badge">missing</Badge>
		{/if}
	</span>
{/snippet}

<!-- Path rendered in the card header's top-level trailing slot. The heading group
     has `flex: 1`, so the trailing slot is pushed flush to the card's right edge;
     `layout.trailing.align = 'start'` top-aligns it against the heading (pindoba's
     own with-buttons-and-icons card demo uses this exact pattern). It's capped and
     truncates first on narrow widths so the name keeps priority. Truncation is
     from the left (`direction: rtl`) because the tail of the path is the
     identifying part; full path on hover. -->
{#snippet pathInfo()}
	<span
		class={css({
			display: 'block',
			maxWidth: '60%',
			fontSize: 'xs',
			color: 'neutral.text.muted',
			fontFamily: 'mono',
			overflow: 'hidden',
			textOverflow: 'ellipsis',
			whiteSpace: 'nowrap',
			direction: 'rtl'
		})}
		title={worktree.getPath()}
		data-testid="worktree-path"
	>
		{worktree.getPath()}
	</span>
{/snippet}

<Card
	{feedback}
	border="default"
	data-testid="worktree-row"
	data-worktree-name={worktree.getName()}
	passThrough={{ root: { style: rootStyle } }}
	header={{
		heading: nameContent,
		trailing: pathInfo,
		// Pin the path to the card's top-right: `align: start` top-aligns the
		// trailing slot against the heading, and `justify: end` flushes its content
		// to the right edge (pindoba's trailing layout support — no passThrough
		// override needed).
		layout: { trailing: { align: 'start', justify: 'end' } }
	} as PrimitiveCardHeaderProps}
>
	<div class={css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' })}>
		<Icon
			icon="lucide:git-branch"
			width="14px"
			height="14px"
			color={token('colors.neutral.text.muted')}
		/>
		<Badge size="sm" emphasis="adaptive">{branchLabel}</Badge>
		{#if worktree.getShortSha()}
			<Tooltip content={`Commit sha: ${worktree.getHeadSha()}`} wrap={false}>
				{#snippet children(triggerProps)}
					<span
						{...triggerProps}
						class={css({ fontSize: 'xs', color: 'neutral.text.muted', fontFamily: 'mono' })}
					>
						{worktree.getShortSha()}
					</span>
				{/snippet}
			</Tooltip>
		{/if}
	</div>
</Card>
