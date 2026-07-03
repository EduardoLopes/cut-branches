<script lang="ts">
	import DeleteBranchModal from '../components/delete-branch-modal.svelte';
	import { useActiveBranchesView } from '../core/composables/use-active-branches-view.svelte';
	import { usePruneOrphanedSearchKeys } from '../core/composables/use-prune-orphaned-search-keys.svelte';
	import BranchListEmptyState from '$domains/branch-management/components/branch-list-empty-state.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSearch from '$domains/branch-management/components/branch-search.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import BulkActionsToolbar from '$domains/branch-management/components/bulk-actions-toolbar.svelte';
	import BranchesLayout from '$domains/branch-management/layouts/branches-layout.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useActiveBranchesView({ getId: () => id });
	usePruneOrphanedSearchKeys();
</script>

<BranchesLayout isLoading={viewState.isLoading}>
	<BulkActionsToolbar>
		{#snippet left()}
			<BranchSelection repository={viewState.currentRepoData} branchContext="active" />
		{/snippet}
		{#snippet right()}
			<BranchSearch
				repository={viewState.currentRepoData}
				branchContext="active"
				placeholder="Search branches"
				data-testid="search-input"
			/>
			{#if viewState.currentRepoData}
				<div data-testid="delete-branch-modal">
					<DeleteBranchModal id={viewState.currentRepoData.name} />
				</div>
			{/if}
		{/snippet}
	</BulkActionsToolbar>

	{#if viewState.isError && viewState.error}
		<ErrorMessage
			message={viewState.error.message}
			description={viewState.error.description ? viewState.error.description : undefined}
		/>
	{/if}

	<BranchListEmptyState
		emptyStateMessage="This repository has no branches!"
		infoMessage={viewState.hasNoBranchesToDelete
			? 'This repository has no branches to delete.'
			: undefined}
		searchNoResultsFound={viewState.searchNoResultsFound}
		searchTerm={viewState.search?.state}
		isLoading={viewState.isLoading}
		branchesLength={viewState.branches.length}
		repositoryId={id}
	/>

	{#key `${id}-current`}
		{#if !viewState.isError && !viewState.searchNoResultsFound && viewState.branches.length > 0}
			<BranchList
				repositoryID={id}
				repositoryPath={viewState.path}
				allowLocking={true}
				allowSelection={true}
				allowSetCurrent={true}
				variant="default"
			/>
		{/if}
	{/key}
</BranchesLayout>
