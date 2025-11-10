<script lang="ts">
	import DeleteBranchModal from '../components/delete-branch-modal.svelte';
	import { useActiveBranchesView } from '../core/composables/use-active-branches-view.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import BranchesEmptyStates from '$domains/branch-management/components/branches-empty-states.svelte';
	import BranchesLayout from '$domains/branch-management/components/branches-layout.svelte';
	import BulkActionsContainer from '$domains/branch-management/components/bulk-actions-container.svelte';
	import SearchInput from '$domains/branch-management/components/search-input.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useActiveBranchesView({ getId: () => id });
</script>

<BranchesLayout isLoading={viewState.isLoading}>
	<BulkActionsContainer>
		{#snippet left()}
			<BranchSelection repository={viewState.currentRepoData} branchContext="active" />
		{/snippet}
		{#snippet right()}
			<SearchInput
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
	</BulkActionsContainer>

	{#if viewState.isError && viewState.error}
		<ErrorMessage
			message={viewState.error.message}
			description={viewState.error.description ? viewState.error.description : undefined}
		/>
	{/if}

	<BranchesEmptyStates
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
