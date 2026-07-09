<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Modal from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import { type Worktree } from '../core/models/worktree';
	import { portal } from '$utils/portal-action';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		open?: boolean;
		/** The worktrees selected for deletion. */
		worktrees: Worktree[];
		isDeleting?: boolean;
		onConfirm: (force: boolean) => void | Promise<void>;
	}

	let { open = $bindable(false), worktrees, isDeleting = false, onConfirm }: Props = $props();

	let force = $state(false);
	const hasLocked = $derived(worktrees.some((w) => w.isLocked()));
	const count = $derived(worktrees.length);

	$effect(() => {
		if (open) force = false;
	});

	async function handleConfirm() {
		if (isDeleting) return;
		await onConfirm(force);
	}
</script>

<div use:portal>
	<Modal
		{open}
		onChange={(next: boolean) => (open = next)}
		title={count === 1 ? 'Delete worktree' : 'Delete worktrees'}
		aria-label="Delete worktrees"
		data-testid="delete-worktrees-modal"
		showCloseButton={!isDeleting}
		passThrough={{
			root: {
				style: css.raw({ width: '480px', maxWidth: 'calc(100vw - token(spacing.2xl))' })
			}
		}}
	>
		<div class={css({ display: 'flex', flexDirection: 'column', gap: 'md', width: 'full' })}>
			<p class={css({ margin: '0', color: 'neutral.text', fontSize: 'sm' })}>
				Delete {count} worktree{count === 1 ? '' : 's'}? Their working directories will be deleted.
				The branches themselves are not removed.
			</p>

			<ul
				class={css({
					margin: '0',
					padding: '0',
					listStyle: 'none',
					display: 'flex',
					flexDirection: 'column',
					gap: '2xs',
					maxHeight: '160px',
					overflowY: 'auto',
					fontSize: 'xs',
					color: 'neutral.text.muted'
				})}
			>
				{#each worktrees as worktree (worktree.getName())}
					<li class={css({ wordBreak: 'break-all' })}>
						<strong class={css({ color: 'neutral.text' })}>{worktree.getName()}</strong> — {worktree.getPath()}
					</li>
				{/each}
			</ul>

			{#if hasLocked}
				<Checkbox
					id="delete-worktrees-force"
					checked={force}
					onchange={() => (force = !force)}
					data-testid="delete-worktrees-force"
				>
					Some selected worktrees are locked — delete them anyway
				</Checkbox>
			{/if}

			<div
				class={css({
					display: 'flex',
					justifyContent: 'flex-end',
					gap: 'sm',
					paddingTop: 'md',
					borderTopWidth: '1px',
					borderTopStyle: 'solid',
					borderTopColor: 'neutral.border.muted'
				})}
			>
				<Button
					emphasis="ghost"
					onclick={() => (open = false)}
					disabled={isDeleting}
					data-testid="delete-worktrees-cancel"
				>
					Cancel
				</Button>
				<Loading loading={isDeleting} variant="busy" indicator>
					<Button
						feedback="danger"
						onclick={handleConfirm}
						disabled={isDeleting}
						data-testid="delete-worktrees-confirm"
					>
						Delete
					</Button>
				</Loading>
			</div>
		</div>
	</Modal>
</div>
