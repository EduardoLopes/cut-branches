<script lang="ts">
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import LucideX from '@lucide/svelte/icons/x';
	import type { BulkSelection } from '@pindoba/core-bulk-bar';
	import BulkBar from '@pindoba/svelte-bulk-bar';
	import Button from '@pindoba/svelte-button';
	import { gridListFocusTarget } from '@pindoba/svelte-grid-list';
	import Group from '@pindoba/svelte-group';
	import Input from '@pindoba/svelte-input';
	import Stamp from '@pindoba/svelte-stamp';
	import DeleteWorktreesModal from '../components/delete-worktrees-modal.svelte';
	import WorktreeList from '../components/worktree-list.svelte';
	import { useWorktreeActions } from '../core/composables/use-worktree-actions.svelte';
	import { useWorktreeSelection } from '../core/composables/use-worktree-selection.svelte';
	import { useWorktreesView } from '../core/composables/use-worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import Icon from '$ui/core/icon.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';
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
	let listElement = $state<HTMLDivElement | null>();

	const selectedWorktrees = $derived(
		filteredWorktrees.filter((worktree) => selection.isSelected(worktree.getName()))
	);
	const selectedNames = $derived(new Set(selection.selectedNames));

	// The selection covers the visible, selectable worktrees, so the page and
	// the collection are one set: "Select all N" matches the toolbar checkbox.
	const bulkSelection: BulkSelection = $derived({
		count: selection.selectedCount,
		pageCount: selection.selectableCount,
		pageSelected: selection.selectedCount,
		total: selection.selectableCount,
		clear: () => selection.clear(),
		selectAll: () => selection.setAll(true)
	});

	async function confirmDelete(force: boolean) {
		const { ok } = await actions.removeMany(selection.selectedNames, force);
		if (ok > 0) selection.clear();
		deleteOpen = false;
	}
</script>

<!-- `padded={false}`: the worktree list is its own scroll port, so the
     inset lives inside it (see the note in worktree-list). -->
<PageWell padded={false} testId="worktrees-view">
	{#snippet toolbar()}
		<PageToolbar data-testid="worktrees-toolbar">
			{#snippet left()}
				<!-- Select-all lives in the list's own header; the toolbar keeps
				     the count. -->
				{#if selection.selectableCount > 0}
					<span
						class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
						data-testid="worktrees-selection-count"
					>
						<span class={css({ color: 'neutral.text.bold' })}>{selection.selectedCount}</span>
						of
						<span class={css({ color: 'neutral.text.bold' })}>{selection.selectableCount}</span>
						worktrees selected
					</span>
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
							<Icon icon={LucideX} width="16px" height="16px" />
						</Stamp>
						<span class={visuallyHidden()}>Clear search</span>
					</Button>
				</Group>
			{/snippet}
		</PageToolbar>
	{/snippet}

	{#snippet overlay()}
		<BulkBar
			selected={bulkSelection}
			actions={[{ id: 'delete', label: 'Delete', icon: Trash2, tone: 'danger' }]}
			onAction={() => (deleteOpen = true)}
			returnFocus={() => (listElement ? gridListFocusTarget(listElement) : null)}
			labels={{ toolbar: 'Worktree actions' }}
			data-testid="worktrees-bulk-bar"
		/>
	{/snippet}

	{#if view.isError && view.error}
		<ErrorMessage
			message={view.error.message}
			description={view.error.description ? view.error.description : undefined}
		/>
	{:else}
		<WorktreeList
			bind:element={listElement}
			worktrees={filteredWorktrees}
			isLoading={view.isLoading}
			busy={actions.isLocking || actions.isUnlocking}
			allowSelection
			selected={selectedNames}
			onSelectionChange={(names) => selection.set(names)}
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
