<script lang="ts">
	import { useDeletedBranchesView } from '../logic/application/use-deleted-branches-view.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import BranchesEmptyStates from '$domains/branch-management/components/branches-empty-states.svelte';
	import BranchesLayout from '$domains/branch-management/components/branches-layout.svelte';
	import BulkActionsContainer from '$domains/branch-management/components/bulk-actions-container.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import SearchInput from '$domains/branch-management/components/search-input.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useDeletedBranchesView({ getId: () => id });
</script>

<BranchesLayout isLoading={viewState.isLoading} variant="inverted">
	<BulkActionsContainer>
		{#snippet left()}
			<BranchSelection repository={viewState.currentRepoData} branchContext="deleted" />
		{/snippet}
		{#snippet right()}
			<SearchInput
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
	</BulkActionsContainer>

	{#if viewState.isError && viewState.error}
		<ErrorMessage
			message={viewState.error.message}
			description={viewState.error.description ? viewState.error.description : undefined}
		/>
	{/if}

	<BranchesEmptyStates
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
				variant="inverted"
			/>
		{/if}
	{/key}
</BranchesLayout>
