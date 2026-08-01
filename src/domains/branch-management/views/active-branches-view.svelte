<script lang="ts">
	import BranchContextFilter from '../components/branch-context-filter.svelte';
	import DeleteBranchModal from '../components/delete-branch-modal.svelte';
	import { useActiveBranchesView } from '../core/composables/use-active-branches-view.svelte';
	import { usePruneOrphanedSearchKeys } from '../core/composables/use-prune-orphaned-search-keys.svelte';
	import BranchListEmptyState from '$domains/branch-management/components/branch-list-empty-state.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSearch from '$domains/branch-management/components/branch-search.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const viewState = useActiveBranchesView({ getId: () => id });
	usePruneOrphanedSearchKeys();
</script>

<PageWell isLoading={viewState.isLoading} testId="active-branches-well">
	{#snippet toolbar()}
		<PageToolbar>
			{#snippet left()}
				<!-- Select-all owns the left edge so it sits on the same column as the
				     per-card checkboxes in the list below. -->
				<BranchSelection repository={viewState.currentRepoData} branchContext="active" />
			{/snippet}
			{#snippet right()}
				<BranchContextFilter repositoryId={id} />
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
		</PageToolbar>
	{/snippet}

	{#if viewState.isError && viewState.error}
		<ErrorMessage
			message={viewState.error.message}
			description={viewState.error.description ? viewState.error.description : undefined}
		/>
	{:else}
		<!-- Only one of these states can show at a time: the error above is
		     mutually exclusive with the empty/no-results states below. The
		     "no branches to delete" note is an info banner for a populated list
		     where nothing is deletable, so it's gated on there being branches —
		     it must not double up with the empty "no branches!" state. -->
		<BranchListEmptyState
			emptyStateMessage="This repository has no branches!"
			infoMessage={viewState.hasNoBranchesToDelete && viewState.branches.length > 0
				? 'This repository has no branches to delete.'
				: undefined}
			searchNoResultsFound={viewState.searchNoResultsFound}
			searchTerm={viewState.search?.state}
			isLoading={viewState.isLoading}
			branchesLength={viewState.branches.length}
			repositoryId={id}
		/>
	{/if}

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
</PageWell>
