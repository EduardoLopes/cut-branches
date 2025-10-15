<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { onDestroy } from 'svelte';
	import {
		getBranchListQuery,
		createActiveBranchesFilter
	} from '../logic/application/queries/get-branch-list-query';
	import { navigating } from '$app/state';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BulkActions from '$domains/branch-management/components/branches-bulk-actions.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import RepositoryHeader from '$domains/repository-management/components/repository-header.svelte';
	import type { Branch } from '$lib/bindings';
	import type { Repository } from '$services/common';
	import { globalStore } from '$store/global-store.svelte';
	import EmptyState from '$ui/core/empty-state.svelte';
	import ErrorMessage from '$ui/core/error-message.svelte';
	import { isEmptyString, ensureString } from '$utils/string-utils';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id: string;
		branchesType?: 'current' | 'deleted'; // Type of branches to display
		allowLocking?: boolean; // Whether branches can be locked
		allowSelection?: boolean; // Whether branches can be selected
		allowSetCurrent?: boolean; // Whether branches can be set as current
	}

	const {
		id,
		branchesType = 'current',
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true
	}: Props = $props();

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === id)
	);

	const path = $derived.by(() => {
		return repository?.path;
	});

	const search = $derived(getSearchBranchesStore(id));

	// Create queries for both current and deleted branches with appropriate filters
	const currentBranchesQuery = getBranchListQuery(
		() => ({
			repoId: id ?? '',
			filters: { ...createActiveBranchesFilter(), includeCurrent: true }
		}),
		{
			enabled: () => branchesType === 'current' && !!id
		}
	);

	const deletedBranchesQuery = getBranchListQuery(
		() => ({
			repoId: id ?? '',
			filters: {
				deletionStatus: 'deleted'
			}
		}),
		{
			enabled: () => branchesType === 'deleted' && !!id
		}
	);

	// Use the appropriate query based on branchesType
	const activeQuery = $derived(
		branchesType === 'current' ? currentBranchesQuery : deletedBranchesQuery
	);

	$effect(() => {
		if (path && activeQuery) {
			globalStore.lastUpdatedAt = new Date(activeQuery.dataUpdatedAt);
		}
	});

	onDestroy(() => {
		clearInterval(interval);
		globalStore.lastUpdatedAt = undefined;
	});

	function update_repo() {
		if (path && branchesType === 'current') {
			currentBranchesQuery?.refetch().then((result) => {
				if (result.data) {
					const repoName = repository?.name ?? 'Repository';
					notifications.push({
						title: 'Repository updated',
						message: `The repository **${repoName}** was updated`,
						feedback: 'success'
					});
				}
			});
		}
	}

	const searchToggle = createToggle(false);

	function clearSearch() {
		search?.clear();
		searchToggle.reset();
	}

	// Get branches from the active query and filter by search term
	let branches = $derived.by(() => {
		const searchTerm = ensureString(search?.state).toLowerCase().trim();
		const data = activeQuery?.data;

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

	// Calculate the number of branches that can be selected
	let selectibleCount = $derived.by(() => {
		if (!branches) {
			return 0;
		}

		// For deleted branches, all branches are selectable
		if (branchesType === 'deleted') {
			return branches.length;
		}

		// For current branches, filter out current branch and locked branches
		const currentBranch = repository?.currentBranch;
		return branches.filter(
			(item: Branch) => item.name !== currentBranch && (!item.isLocked || !allowLocking)
		).length;
	});

	let searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(selectibleCount === 0 && isEmptyString(search?.state));

	// Get the current repository data from the active query
	const currentRepoData = $derived.by(() => {
		const data = activeQuery?.data;
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

	// Get the repository name and ID for headers
	const repoInfo = $derived.by(() => {
		if (repository) {
			return {
				id: id,
				name: repository.name,
				currentBranch: repository.currentBranch
			};
		}
		return undefined;
	});

	// Determine loading and error states from the active query
	const isLoading = $derived(activeQuery?.isLoading ?? false);
	const isFetching = $derived(activeQuery?.isFetching ?? false);
	const isError = $derived(activeQuery?.isError ?? false);
	const error = $derived(activeQuery?.error);
</script>

{#snippet restoreDeletedBranchModalSnippet(
	repo: Repository,
	selectedBranches?: Set<string> | undefined
)}
	<div data-testid="restore-branch-modal">
		<RestoreDeletedBranchModal
			repoId={repo?.id}
			buttonProps={{ disabled: selectedBranches?.size === 0 }}
		/>
	</div>
{/snippet}

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)',
		pl: 0
	})}
	class:deleted={branchesType === 'deleted'}
>
	<main
		class={css({
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			position: 'relative',
			height: '100%',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			}
		})}
	>
		<!-- TOP BAR -->
		{#if repoInfo}
			<RepositoryHeader
				repositoryId={repoInfo.id}
				isLoading={isLoading ?? false}
				isFetching={isFetching ?? false}
				onUpdate={update_repo}
				title={branchesType === 'deleted'
					? `Restore branches from ${repoInfo.name.toLocaleUpperCase()}`
					: undefined}
				showBackButton={branchesType === 'deleted'}
				showRestoreButton={branchesType === 'current'}
				showUpdateButton={branchesType === 'current'}
				showRemoveButton={branchesType === 'current'}
			/>
		{/if}
		<!-- TOP BAR END -->

		<Loading
			isLoading={isLoading ?? false}
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
					borderColor: 'transparent',
					'.deleted &': {
						borderColor: 'danger.600',
						_light: {
							background: 'danger.200'
						},
						_dark: {
							background: 'danger.50'
						}
					},
					_light: {
						background: 'neutral.200'
					},
					_dark: {
						background: 'neutral.50'
					}
				})
			}}
		>
			<!-- GERAL -->

			{#if allowSelection}
				<BulkActions
					currentRepo={currentRepoData}
					onSearch={() => {
						// Reset page on search
					}}
					onClearSearch={clearSearch}
					actionsSnippet={branchesType === 'deleted' ? restoreDeletedBranchModalSnippet : undefined}
					branchContext={branchesType === 'deleted' ? 'deleted' : 'current'}
				/>
			{/if}

			<!-- ERRO MESSAGE -->
			{#if isError && error}
				<ErrorMessage message={error.message} description={error.description ?? undefined} />
			{/if}
			<!-- ERRO MESSAGE END -->

			{#if hasNoBranchesToDelete && branchesType === 'current'}
				<div
					class={css({
						display: 'flex',
						alignItems: 'center',
						padding: 'md',
						fontSize: 'md'
					})}
				>
					This repository has no branches to delete.
				</div>
			{/if}

			{#if searchNoResultsFound}
				<EmptyState message={`No results for **${search?.state}**!`} testId="no-results-message" />
			{/if}

			{#if branches.length === 0 && !searchNoResultsFound && !isLoading}
				<EmptyState
					message={branchesType === 'deleted'
						? 'No deleted branches found!'
						: 'This repository has no branches!'}
					icon="mdi:source-branch-remove"
				/>
			{/if}
			<!-- BRANCHES -->
			{#key `${id}-${branchesType}`}
				{#if !isError && !searchNoResultsFound && branches.length > 0 && repoInfo}
					<BranchList
						repositoryID={id}
						repositoryPath={path}
						{allowLocking}
						{allowSelection}
						{allowSetCurrent}
						variant={branchesType === 'deleted' ? 'inverted' : 'default'}
					/>
				{/if}
			{/key}
			<!-- BRANCHES END -->
		</Loading>
	</main>
</div>
