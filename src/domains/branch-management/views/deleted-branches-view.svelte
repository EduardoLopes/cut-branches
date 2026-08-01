<script lang="ts">
	import BranchContextFilter from '../components/branch-context-filter.svelte';
	import { useDeletedBranchesView } from '../core/composables/use-deleted-branches-view.svelte';
	import BranchListEmptyState from '$domains/branch-management/components/branch-list-empty-state.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSearch from '$domains/branch-management/components/branch-search.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useDeletedBranchesView({ getId: () => id });
</script>

<PageWell isLoading={viewState.isLoading} testId="deleted-branches-well">
	{#snippet toolbar()}
		<PageToolbar>
			{#snippet left()}
				<!-- Select-all owns the left edge so it sits on the same column as the
				     per-card checkboxes in the list below. -->
				<BranchSelection repository={viewState.currentRepoData} branchContext="deleted" />
			{/snippet}
			{#snippet right()}
				<BranchContextFilter repositoryId={id} />
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
		</PageToolbar>
	{/snippet}

	<!-- Error and empty are mutually exclusive, same as the active view — before,
	     this one rendered both unconditionally in sequence. -->
	{#if viewState.isError && viewState.error}
		<ErrorMessage
			message={viewState.error.message}
			description={viewState.error.description ? viewState.error.description : undefined}
		/>
	{:else}
		<BranchListEmptyState
			emptyStateMessage="No deleted branches found!"
			searchNoResultsFound={viewState.searchNoResultsFound}
			searchTerm={viewState.search?.state}
			isLoading={viewState.isLoading}
			branchesLength={viewState.branches.length}
			repositoryId={id}
		/>
	{/if}

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
</PageWell>
