<script lang="ts">
	import { useDeletedBranchesView } from '../core/composables/use-deleted-branches-view.svelte';
	import BranchListEmptyState from '$domains/branch-management/components/branch-list-empty-state.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSearch from '$domains/branch-management/components/branch-search.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import BulkActionsToolbar from '$domains/branch-management/components/bulk-actions-toolbar.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import BranchesLayout from '$domains/branch-management/layouts/branches-layout.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useDeletedBranchesView({ getId: () => id });
</script>

<BranchesLayout isLoading={viewState.isLoading}>
	<BulkActionsToolbar>
		{#snippet left()}
			<BranchSelection repository={viewState.currentRepoData} branchContext="deleted" />
		{/snippet}
		{#snippet right()}
			<BranchSearch
				repository={viewState.currentRepoData}
				branchContext="deleted"
				placeholder="Search branches"
				data-testid="search-input"
			/>
			{#if viewState.currentRepoData}
				<div data-testid="restore-branch-modal">
					<RestoreDeletedBranchModal repoId={viewState.currentRepoData.id} />
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
		emptyStateMessage="No deleted branches found!"
		searchNoResultsFound={viewState.searchNoResultsFound}
		searchTerm={viewState.search?.state}
		isLoading={viewState.isLoading}
		branchesLength={viewState.branches.length}
		repositoryId={id}
	/>

	{#key `${id}-deleted`}
		{#if !viewState.isError && !viewState.searchNoResultsFound && viewState.branches.length > 0}
			<BranchList
				repositoryID={id}
				repositoryPath={viewState.path}
				allowLocking={false}
				allowSelection={true}
				allowSetCurrent={false}
				showAlerts={false}
				variant="inverted"
			/>
		{/if}
	{/key}
</BranchesLayout>
