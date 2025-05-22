<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { onDestroy } from 'svelte';
	import RestoreDeletedBranchModal from './restore-deleted-branch-modal.svelte';
	import { navigating } from '$app/state';
	import BranchList from '$lib/components/branch-list.svelte';
	import BulkActions from '$lib/components/branches-bulk-actions.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import ErrorMessage from '$lib/components/error-message.svelte';
	import RepositoryHeader from '$lib/components/repository-header.svelte';
	import type { Branch, Repository } from '$lib/services/common';
	import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
	import { getDeletedBranchesStore } from '$lib/stores/deleted-branches.svelte';
	import { globalStore } from '$lib/stores/global-store.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import {
		getSelectedBranchesStore,
		getSelectedDeletedBranchesStore
	} from '$lib/stores/selected-branches.svelte';
	import { isEmptyString, ensureString } from '$lib/utils/string-utils';
	import { createToggle } from '$lib/utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id?: string;
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

	const oneMinute = 60000;

	const repository = $derived(getRepositoryStore(id));
	const search = $derived(getSearchBranchesStore(id));
	const locked = $derived(getLockedBranchesStore(id));
	const selectedBranchesStore = $derived(getSelectedBranchesStore(id));
	const selectedDeletedBranchesStore = $derived(getSelectedDeletedBranchesStore(id));
	const selected = $derived(
		branchesType === 'current' ? selectedBranchesStore : selectedDeletedBranchesStore
	);
	const deletedBranchesStore = $derived(getDeletedBranchesStore(id));

	const getBranchesQuery = createGetRepositoryByPathQuery(() => repository?.state?.path, {
		staleTime: oneMinute
	});

	$effect(() => {
		if (repository?.state?.path) {
			globalStore.lastUpdatedAt = new Date(getBranchesQuery.dataUpdatedAt);
		}
	});

	$effect(() => {
		if (getBranchesQuery.data && repository) {
			// Compare important properties individually to ensure changes are detected
			const currentState = repository.state;
			const queryData = getBranchesQuery.data;

			// Only update if there's a meaningful change
			if (
				!currentState ||
				currentState.branchesCount !== queryData.branchesCount ||
				currentState.branches.length !== queryData.branches.length ||
				currentState.currentBranch !== queryData.currentBranch
			) {
				repository.set(queryData);
			}
		}
	});

	onDestroy(() => {
		clearInterval(interval);
		globalStore.lastUpdatedAt = undefined;
	});

	function update_repo() {
		if (repository?.state) {
			getBranchesQuery.refetch().then((query) => {
				notifications.push({
					title: 'Repository updated',
					message: `The repository **${query.data?.name}** was updated`,
					feedback: 'success'
				});
			});
		}
	}

	const searchToggle = createToggle(false);

	function clearSearch() {
		search?.clear();
		searchToggle.reset();
	}

	let branches = $derived(
		repository?.state
			? repository?.state?.branches.filter((item: Branch) =>
					item.name.toLowerCase().trim().includes(ensureString(search?.state).toLowerCase().trim())
				)
			: []
	);

	let deletedBranches = $derived(deletedBranchesStore?.state?.branches ?? []);

	// Filter deleted branches by search term if needed
	let filteredDeletedBranches = $derived(
		branchesType === 'deleted' && search?.state
			? deletedBranches.filter((item) =>
					item.name.toLowerCase().trim().includes(ensureString(search?.state).toLowerCase().trim())
				)
			: deletedBranches
	);

	$effect(() => {
		if (navigating) {
			// Reset page on navigation
		}
	});

	let selectibleCount = $derived.by(() => {
		if (branchesType === 'deleted') {
			return filteredDeletedBranches.filter((item) => item.isReachable !== false).length;
		}

		if (!branches || !repository?.state) {
			return 0;
		}
		return branches.filter(
			(item: Branch) =>
				item.name !== repository?.state?.currentBranch && (!locked?.has(item.name) || !allowLocking)
		).length;
	});

	let searchNoResultsFound = $derived(
		(search?.state?.length ?? 0) > 0 &&
			(branchesType === 'current' ? branches?.length === 0 : filteredDeletedBranches.length === 0)
	);

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(
		branchesType === 'current'
			? selectibleCount === 0 && isEmptyString(search?.state)
			: filteredDeletedBranches.length === 0
	);

	const selectedSearchLength = $derived(
		branchesType === 'current'
			? (branches?.filter((item: Branch) => selectedBranchesStore?.has(item.name)).length ?? 0)
			: (filteredDeletedBranches.filter((item) => selectedDeletedBranchesStore?.has(item.name))
					.length ?? 0)
	);

	// Determine which branches to display
	let displayBranches = $derived(branchesType === 'current' ? branches : filteredDeletedBranches);
</script>

{#snippet restoreDeletedBranchModalSnippet(
	repo: Repository,
	selectedBranches: Set<string> | undefined
)}
	<div data-testid="delete-branch-modal">
		<RestoreDeletedBranchModal
			repoId={repo?.name}
			buttonProps={{ disabled: selectedBranches?.size === 0 }}
		/>
	</div>
{/snippet}

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)',
		padding: 'md',
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
			borderRadius: 'md',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			}
		})}
	>
		<!-- TOP BAR -->
		{#if repository?.state}
			<RepositoryHeader
				repositoryId={repository?.state?.id}
				isLoading={getBranchesQuery.isFetching}
				onUpdate={update_repo}
				title={branchesType === 'deleted'
					? `Restore branches from ${repository?.state?.name.toLocaleUpperCase()}`
					: undefined}
				showBackButton={branchesType === 'deleted'}
				showRestoreButton={branchesType === 'current'}
				showUpdateButton={branchesType === 'current'}
				showRemoveButton={branchesType === 'current'}
			/>
		{/if}
		<!-- TOP BAR END -->

		<Loading
			isLoading={getBranchesQuery.isLoading}
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
					currentRepo={repository?.state}
					selectibleCount={branchesType === 'current'
						? selectibleCount
						: filteredDeletedBranches.length}
					{selectedSearchLength}
					branches={branchesType === 'current' ? branches : filteredDeletedBranches}
					onSearch={() => {
						// Reset page on search
					}}
					onClearSearch={clearSearch}
					actionsSnippet={branchesType === 'deleted' ? restoreDeletedBranchModalSnippet : undefined}
					selectedStore={selected}
				/>
			{/if}

			<!-- ERRO MESSAGE -->
			{#if getBranchesQuery.isError}
				<ErrorMessage
					message={getBranchesQuery.error.message}
					description={getBranchesQuery.error.description}
				/>
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

			{#if branchesType === 'current' && repository?.state?.branches.length === 0}
				<EmptyState message="This repository has no branches!" icon="mdi:source-branch-remove" />
			{/if}

			{#if branchesType === 'deleted' && filteredDeletedBranches.length === 0 && !searchNoResultsFound}
				<EmptyState message="No deleted branches found!" icon="mdi:source-branch-remove" />
			{/if}

			<!-- BRANCHES -->
			{#key `${id}-${branchesType}`}
				{#if repository?.state && !getBranchesQuery.isError && !searchNoResultsFound && displayBranches.length > 0}
					<BranchList
						branches={displayBranches}
						currentBranch={branchesType === 'current' ? repository?.state?.currentBranch : ''}
						repositoryID={id}
						{allowLocking}
						{allowSelection}
						{allowSetCurrent}
						selectedStore={selected}
					/>
				{/if}
			{/key}
			<!-- BRANCHES END -->
		</Loading>
	</main>
</div>
