<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import DeleteWorktreesModal from '../components/delete-worktrees-modal.svelte';
	import WorktreeList from '../components/worktree-list.svelte';
	import { useWorktreeActions } from '../core/composables/use-worktree-actions.svelte';
	import { useWorktreeSelection } from '../core/composables/use-worktree-selection.svelte';
	import { useWorktreesView } from '../core/composables/use-worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';
	import ValidationHint from '$ui/patterns/validation-hint.svelte';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		/** Repository id (resolved to a working-directory path). */
		id: string;
	}

	let { id }: Props = $props();

	const repositoryQuery = createGetRepositoryQuery(() => ({ id }), { enabled: () => !!id });
	const repoPath = $derived(repositoryQuery.data?.path ?? '');

	const view = useWorktreesView({ getPath: () => repoPath });
	const actions = useWorktreeActions({ getPath: () => repoPath });

	let searchTerm = $state('');
	const filteredWorktrees = $derived.by(() => {
		const query = searchTerm.trim().toLowerCase();
		if (!query) return view.worktrees;
		return view.worktrees.filter(
			(worktree) =>
				worktree.getName().toLowerCase().includes(query) ||
				(worktree.getBranch()?.toLowerCase().includes(query) ?? false) ||
				worktree.getPath().toLowerCase().includes(query)
		);
	});

	// Selection operates over the visible (filtered) worktrees.
	const selection = useWorktreeSelection({ getWorktrees: () => filteredWorktrees });

	let deleteOpen = $state(false);
	let hintOpen = $state(false);

	const selectedWorktrees = $derived(
		filteredWorktrees.filter((worktree) => selection.isSelected(worktree.getName()))
	);

	// Clear the hint once something is selected.
	$effect(() => {
		if (hintOpen && selection.selectedCount > 0) hintOpen = false;
	});

	function openDelete() {
		if (selection.selectedCount === 0) {
			hintOpen = true;
			return;
		}
		deleteOpen = true;
	}

	async function confirmDelete(force: boolean) {
		const { ok } = await actions.removeMany(selection.selectedNames, force);
		if (ok > 0) selection.clear();
		deleteOpen = false;
	}
</script>

<PageWell testId="worktrees-view">
	{#snippet toolbar()}
		<PageToolbar data-testid="worktrees-toolbar">
			{#snippet left()}
				<!-- Same shape as the branches toolbar: an `lg` checkbox (matching the
				     per-row checkbox column) with the count as a small muted sibling,
				     not as the control's own label. Keeps both pages' bars identical. -->
				{#if selection.selectableCount > 0}
					<div class={css({ display: 'flex', alignItems: 'center', gap: '2xs' })}>
						<Checkbox
							id="worktrees-select-all"
							size="lg"
							aria-label="Select all worktrees"
							checked={selection.allSelected}
							indeterminate={selection.someSelected}
							onclick={() => selection.setAll(!selection.allSelected)}
							data-testid="worktrees-select-all"
						/>
						<span
							class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
							data-testid="worktrees-selection-count"
						>
							<span class={css({ color: 'neutral.text.bold' })}>{selection.selectedCount}</span>
							of
							<span class={css({ color: 'neutral.text.bold' })}>{selection.selectableCount}</span>
							worktrees selected
						</span>
					</div>
				{:else}
					<span class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}>
						No worktrees to manage
					</span>
				{/if}
			{/snippet}

			{#snippet right()}
				<Group>
					<Input
						class={css({ width: '150px' })}
						size="sm"
						placeholder="Search worktrees"
						autocorrect="off"
						bind:value={searchTerm}
						data-testid="worktrees-search"
					/>
					<Button
						size="sm"
						shape="square"
						onclick={() => (searchTerm = '')}
						disabled={!searchTerm}
						data-testid="worktrees-search-clear"
					>
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon="mdi:clear" width="16px" height="16px" />
						</Stamp>
						<span class={visuallyHidden()}>Clear search</span>
					</Button>
				</Group>

				<ValidationHint
					bind:open={hintOpen}
					message="Select at least one worktree to delete."
					data-testid="worktrees-delete-validation"
				>
					{#snippet trigger(triggerProps)}
						<Loading loading={actions.isRemoving} variant="busy" indicator>
							<Button
								{...triggerProps}
								feedback="danger"
								size="sm"
								class={css({ whiteSpace: 'nowrap' })}
								onclick={openDelete}
								data-testid="worktrees-delete"
							>
								Delete
								{#snippet leading()}
									<Stamp emphasis="ghost" border="none" background="transparent">
										<Icon icon="ion:trash-outline" width="16px" height="16px" />
									</Stamp>
								{/snippet}
								{#snippet trailing()}
									<Badge size="sm" emphasis="adaptive">{selection.selectedCount}</Badge>
								{/snippet}
							</Button>
						</Loading>
					{/snippet}
				</ValidationHint>
			{/snippet}
		</PageToolbar>
	{/snippet}

	{#if view.isError && view.error}
		<ErrorMessage
			message={view.error.message}
			description={view.error.description ? view.error.description : undefined}
		/>
	{:else}
		<WorktreeList
			worktrees={filteredWorktrees}
			isLoading={view.isLoading}
			busy={actions.isLocking || actions.isUnlocking}
			allowSelection
			isSelected={(name) => selection.isSelected(name)}
			onToggleSelect={(worktree) => selection.toggle(worktree.getName())}
			onLock={(worktree) => actions.lock(worktree.getName())}
			onUnlock={(worktree) => actions.unlock(worktree.getName())}
		/>
	{/if}
</PageWell>

<DeleteWorktreesModal
	bind:open={deleteOpen}
	worktrees={selectedWorktrees}
	isDeleting={actions.isRemoving}
	onConfirm={confirmDelete}
/>
