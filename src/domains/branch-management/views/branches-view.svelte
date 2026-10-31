<script lang="ts">
	import BranchBulkBar from '../components/branch-bulk-bar.svelte';
	import BranchContextFilter from '../components/branch-context-filter.svelte';
	import DeleteBranchModal from '../components/delete-branch-modal.svelte';
	import { useActiveBranchesView } from '../core/composables/use-active-branches-view.svelte';
	import { useDeletedBranchesView } from '../core/composables/use-deleted-branches-view.svelte';
	import { usePruneOrphanedSearchKeys } from '../core/composables/use-prune-orphaned-search-keys.svelte';
	import BranchListEmptyState from '$domains/branch-management/components/branch-list-empty-state.svelte';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSearch from '$domains/branch-management/components/branch-search.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import PageToolbar from '$ui/patterns/page-toolbar.svelte';
	import PageWell from '$ui/patterns/page-well.svelte';

	/**
	 * The branches page: active and deleted branches are one filter over one
	 * page, so they share this view (and its well and toolbar) instead of each
	 * mounting their own. Switching between them only swaps what depends on
	 * the context; the Active / Deleted control stays mounted, so its thumb
	 * slides instead of being reborn on the new segment.
	 */
	interface Props {
		id: string;
		/** Which branches the page shows — the route decides. */
		context: 'active' | 'deleted';
	}

	const { id, context }: Props = $props();

	// Both read queries the toolbar filter already holds for its counts, so the
	// inactive one costs nothing extra.
	const activeView = useActiveBranchesView({ getId: () => id });
	const deletedView = useDeletedBranchesView({ getId: () => id });
	const viewState = $derived(context === 'active' ? activeView : deletedView);
	usePruneOrphanedSearchKeys();

	let deleteOpen = $state(false);
	let restoreOpen = $state(false);
	let branchListElement = $state<HTMLDivElement | null>();
</script>

<!-- `padded={false}`: the branch list scrolls internally, so the well's inset has
     to live *inside* that scroll port — otherwise cards clip against a static
     gutter instead of travelling to the well's edges. BranchList and the empty
     states each bring their own padding. -->
<PageWell isLoading={viewState.isLoading} padded={false} testId={`${context}-branches-well`}>
	{#snippet toolbar()}
		<PageToolbar>
			{#snippet left()}
				<!-- Select-all owns the left edge so it sits on the same column as the
				     per-card checkboxes in the list below. -->
				<BranchSelection repository={viewState.currentRepoData} branchContext={context} />
			{/snippet}
			{#snippet right()}
				<BranchContextFilter repositoryId={id} />
				<!-- Each context keeps its own search term (the store is keyed by it). -->
				<BranchSearch
					repository={viewState.currentRepoData}
					branchContext={context}
					placeholder="Search branches"
					data-testid="search-input"
				/>
			{/snippet}
		</PageToolbar>
	{/snippet}

	{#snippet overlay()}
		<BranchBulkBar
			repository={viewState.currentRepoData}
			branchContext={context}
			listElement={branchListElement}
			onAction={() => (context === 'active' ? (deleteOpen = true) : (restoreOpen = true))}
		/>
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
			emptyStateMessage={context === 'active'
				? 'This repository has no branches!'
				: 'No deleted branches found!'}
			infoMessage={context === 'active' &&
			activeView.hasNoBranchesToDelete &&
			activeView.branches.length > 0
				? 'This repository has no branches to delete.'
				: undefined}
			searchNoResultsFound={viewState.searchNoResultsFound}
			searchTerm={viewState.search?.state}
			isLoading={viewState.isLoading}
			branchesLength={viewState.branches.length}
			repositoryId={id}
		/>
	{/if}

	{#key `${id}-${context}`}
		{#if !viewState.isError && !viewState.searchNoResultsFound && viewState.branches.length > 0}
			<BranchList
				bind:element={branchListElement}
				repositoryID={id}
				repositoryPath={viewState.path}
				allowLocking={context === 'active'}
				allowSelection={true}
				allowSetCurrent={context === 'active'}
				showAlerts={context === 'active'}
			/>
		{/if}
	{/key}
</PageWell>

{#if activeView.currentRepoData}
	<DeleteBranchModal id={activeView.currentRepoData.name} bind:open={deleteOpen} />
{/if}
{#if deletedView.currentRepoData}
	<RestoreDeletedBranchModal repoId={deletedView.currentRepoData.id} bind:open={restoreOpen} />
{/if}
