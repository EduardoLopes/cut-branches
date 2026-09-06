<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { type Worktree } from '../core/models/worktree';
	import WorktreeRow from './worktree-row.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		worktrees: Worktree[];
		isLoading?: boolean;
		busy?: boolean;
		/** Whether to show selection checkboxes for linked worktrees. */
		allowSelection?: boolean;
		isSelected?: (name: string) => boolean;
		onToggleSelect?: (worktree: Worktree) => void;
		onLock: (worktree: Worktree) => void;
		onUnlock: (worktree: Worktree) => void;
	}

	let {
		worktrees,
		isLoading = false,
		busy = false,
		allowSelection = false,
		isSelected = () => false,
		onToggleSelect = () => {},
		onLock,
		onUnlock
	}: Props = $props();
</script>

<!-- Surface and inset come from the enclosing PageWell. -->
<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		flex: 1,
		minHeight: '0'
	})}
	data-testid="worktree-list"
>
	{#if isLoading}
		<div
			class={css({
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 'sm',
				paddingY: '2xl',
				color: 'neutral.text.muted'
			})}
			data-testid="worktree-list-loading"
		>
			<Loading loading variant="busy" indicator />
			<span class={css({ fontSize: 'sm' })}>Loading worktrees…</span>
		</div>
	{:else if worktrees.length === 0}
		<EmptyState
			icon="lucide:trees"
			size="sm"
			message="No worktrees found."
			testId="worktree-list-empty"
		/>
	{:else}
		<div
			role="list"
			class={css({
				display: 'flex',
				flexDirection: 'column',
				gap: 'md',
				width: 'full'
			})}
		>
			{#each worktrees as worktree (worktree.getName())}
				<div
					role="listitem"
					class={css({
						display: 'grid',
						alignItems: 'start',
						gap: 'xs'
					})}
					style:grid-template-columns={worktree.isMain() ? '1fr' : 'auto 1fr'}
				>
					<!-- Left rail: selection on top, lock/unlock below (branches convention),
					     anchored to the top of the card and left-aligned so the checkbox and
					     the (narrower) lock button share a left edge — matching the branches
					     rail. The main worktree has neither control, so it drops the rail
					     entirely and its card fills the full width. -->
					{#if !worktree.isMain()}
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'flex-start',
								gap: 'xs'
							})}
						>
							{#if allowSelection}
								<Checkbox
									size="lg"
									id={`worktree-select-${worktree.getName()}`}
									checked={isSelected(worktree.getName())}
									disabled={worktree.isLocked()}
									onclick={() => onToggleSelect(worktree)}
									data-testid={`worktree-select-${worktree.getName()}`}
								>
									<div class={visuallyHidden()}>{worktree.getName()}</div>
								</Checkbox>
							{/if}

							<Tooltip
								content={worktree.isLocked() ? 'Unlock worktree' : 'Lock worktree'}
								placement="left"
							>
								{#snippet children(triggerProps)}
									<Button
										size="xs"
										shape="square"
										emphasis="secondary"
										feedback={worktree.isLocked() ? 'warning' : undefined}
										disabled={busy}
										class={css({ width: '24px', height: '24px' })}
										onclick={() => (worktree.isLocked() ? onUnlock(worktree) : onLock(worktree))}
										data-testid={worktree.isLocked() ? 'worktree-unlock' : 'worktree-lock'}
										{...triggerProps}
									>
										<Stamp emphasis="ghost" border="none" background="transparent">
											<Icon
												icon={worktree.isLocked() ? 'lucide:lock' : 'lucide:lock-open'}
												width="14px"
												height="14px"
											/>
										</Stamp>
										<span class={visuallyHidden()}>
											{worktree.isLocked() ? 'Unlock' : 'Lock'}
										</span>
									</Button>
								{/snippet}
							</Tooltip>
						</div>
					{/if}

					<WorktreeRow {worktree} selected={isSelected(worktree.getName())} />
				</div>
			{/each}
		</div>
	{/if}
</div>
