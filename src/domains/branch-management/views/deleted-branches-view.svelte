<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { onDestroy } from 'svelte';
	import { createGetBranchesQuery } from '../logic/application/queries/create-get-branches-query';
	import { navigating } from '$app/state';
	import { page } from '$app/state';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import BulkActionsContainer from '$domains/branch-management/components/bulk-actions-container.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import SearchInput from '$domains/branch-management/components/search-input.svelte';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import type { Branch } from '$lib/bindings';
	import type { Repository } from '$services/common';
	import { globalStore } from '$store/global-store.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import { ensureString } from '$utils/string-utils';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id: string;
	}

	const { id }: Props = $props();

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === id)
	);

	const path = $derived.by(() => {
		return repository?.path;
	});

	const search = $derived(getSearchBranchesStore(`${id}-deleted`));

	// Query for deleted branches
	const deletedBranchesQuery = createGetBranchesQuery(
		() => ({
			repoId: id ?? '',
			filters: {
				deletionStatus: 'deleted'
			}
		}),
		{
			enabled: () => !!id
		}
	);

	$effect(() => {
		if (path && deletedBranchesQuery) {
			globalStore.lastUpdatedAt = new Date(deletedBranchesQuery.dataUpdatedAt);
		}
	});

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
		globalStore.lastUpdatedAt = undefined;
	});

	const searchToggle = createToggle(false);

	function clearSearch() {
		search?.clear();
		searchToggle.reset();
	}

	// Get branches from query and filter by search term
	let branches = $derived.by(() => {
		const searchTerm = ensureString(search?.state).toLowerCase().trim();
		const data = deletedBranchesQuery?.data;

		if (!data?.branches) {
			return [];
		}

		return data.branches.filter((item: Branch) =>
			item.name.toLowerCase().trim().includes(searchTerm)
		);
	});

	$effect(() => {
		if (navigating) {
			// Reset page on navigation
		}
	});

	let searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	// Get the current repository data from the query
	const currentRepoData = $derived.by(() => {
		const data = deletedBranchesQuery?.data;
		if (!data) return undefined;

		// Construct a Repository object from query data
		return {
			id: id,
			name: repository?.name ?? '',
			currentBranch: repository?.currentBranch ?? '',
			path: repository?.path ?? '',
			branchesCount: data.branches.length,
			branches: data.branches
		} as Repository;
	});

	// Determine loading and error states from the query
	const isLoading = $derived(deletedBranchesQuery?.isLoading ?? false);
	const isError = $derived(deletedBranchesQuery?.isError ?? false);
	const error = $derived(deletedBranchesQuery?.error);

	const branchContext = $derived(page.url.pathname.includes('/restore') ? 'deleted' : 'active');
</script>

<Loading
	{isLoading}
	fillParent
	passThrough={{
		root: css.raw({
			borderRadius: '0',
			flexGrow: '1',
			height: 'calc(100% - 60px)',
			_dark: {
				background: 'neutral.100'
			},
			_light: {
				background: 'neutral.50'
			},
			px: 'md',
			pb: 'md'
		}),
		overlay: css.raw({
			borderRadius: '0',
			border: 'none'
		}),
		content: css.raw({
			display: 'flex',
			flexGrow: '1',
			flexDirection: 'column',
			width: '100%',
			height: 'auto',
			overflowY: 'auto',
			overflowX: 'hidden',
			borderRadius: 'md',
			border: '1px solid',
			borderColor: 'danger.600',
			_light: {
				background: 'danger.200'
			},
			_dark: {
				background: 'danger.50'
			}
		})
	}}
>
	<!-- BULK ACTIONS -->
	<BulkActionsContainer>
		{#snippet left()}
			<BranchSelection repository={currentRepoData} {branchContext} />
		{/snippet}
		{#snippet right()}
			<SearchInput
				repository={currentRepoData}
				oninput={() => {
					// Reset page on search
				}}
				onclear={clearSearch}
				{branchContext}
				placeholder="Search branches"
				data-testid="search-input"
			/>
			{#if currentRepoData}
				<div data-testid="restore-branch-modal">
					<RestoreDeletedBranchModal repoId={currentRepoData.id} />
				</div>
			{/if}
		{/snippet}
	</BulkActionsContainer>
	<!-- ERROR MESSAGE -->
	{#if isError && error}
		<ErrorMessage message={error.message} description={error.description ?? undefined} />
	{/if}
	<!-- ERROR MESSAGE END -->

	{#key `${id}-deleted-search-${search?.state}`}
		{#if searchNoResultsFound}
			<EmptyState message={`No results for **${search?.state}**!`} testId="no-results-message" />
		{/if}

		{#if branches.length === 0 && !searchNoResultsFound && !isLoading}
			<EmptyState message="No deleted branches found!" icon="mdi:source-branch-remove" />
		{/if}
	{/key}

	<!-- BRANCHES -->
	{#key `${id}-deleted`}
		{#if !isError && !searchNoResultsFound && branches.length > 0}
			<BranchList
				repositoryID={id}
				repositoryPath={path}
				allowLocking={false}
				allowSelection={true}
				allowSetCurrent={false}
				variant="inverted"
			/>
		{/if}
	{/key}
	<!-- BRANCHES END -->
</Loading>
