<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Modal from '@pindoba/svelte-dialog';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import { type Worktree } from '../core/models/worktree';
	import TruncatedPath from '$ui/core/truncated-path.svelte';
	import DialogFooter from '$ui/patterns/dialog-footer.svelte';
	import DialogHeader from '$ui/patterns/dialog-header.svelte';
	import ScrollWell from '$ui/patterns/scroll-well.svelte';
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

	const nameClass = css({ fontSize: 'sm', fontWeight: 'medium', whiteSpace: 'nowrap' });
	const pathClass = css({ fontSize: 'xs', minWidth: '0' });
</script>

<div use:portal>
	<Modal
		{open}
		onOpenChange={(next: boolean) => (open = next)}
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
		{#snippet header()}
			<DialogHeader
				title={count === 1 ? 'Delete worktree' : 'Delete worktrees'}
				subtitle={`Delete ${count} worktree${count === 1 ? '' : 's'}? Their working directories will be deleted. The branches themselves are not removed.`}
				icon="lucide:trash-2"
			/>
		{/snippet}

		<div class={css({ display: 'flex', flexDirection: 'column', gap: 'md', width: 'full' })}>
			<ScrollWell class={css({ maxHeight: '160px' })} testId="delete-worktrees-list">
				<GridList
					label="Worktrees to delete"
					items={worktrees}
					getId={(worktree: Worktree) => worktree.getName()}
					look="cards"
					rowBackground="surface.peak"
					columns={[
						{ id: 'name', track: 'auto' },
						{ id: 'path', track: 'minmax(0, 1fr)' }
					]}
				>
					{#snippet row(worktree, { cell })}
						<span {...cell('name', { class: nameClass })} data-testid="delete-worktrees-item">
							{worktree.getName()}
						</span>
						<span {...cell('path')}>
							<TruncatedPath
								path={worktree.getPath()}
								highlight={worktree.getName()}
								align="end"
								class={pathClass}
							/>
						</span>
					{/snippet}
				</GridList>
			</ScrollWell>

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

			<DialogFooter>
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
						tone="danger"
						onclick={handleConfirm}
						disabled={isDeleting}
						data-testid="delete-worktrees-confirm"
					>
						Delete
					</Button>
				</Loading>
			</DialogFooter>
		</div>
	</Modal>
</div>
