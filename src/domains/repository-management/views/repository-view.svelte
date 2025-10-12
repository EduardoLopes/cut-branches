<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { onDestroy } from 'svelte';
	import { createListRepositoriesQuery } from '../logic/application/queries/create-list-repositories-query';
	import { navigating } from '$app/state';
	import BranchList from '$domains/branch-management/components/branch-list.svelte';
	import BulkActions from '$domains/branch-management/components/branches-bulk-actions.svelte';
	import RestoreDeletedBranchModal from '$domains/branch-management/components/restore-deleted-branch-modal.svelte';
	import { createListBranchesQuery } from '$domains/branch-management/services/createListBranchesQuery';
	import { createLockedBranchesQuery } from '$domains/branch-management/services/createLockedBranchesQuery';
	import { createSelectedBranchesQuery } from '$domains/branch-management/services/createSelectedBranchesQuery';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import RepositoryHeader from '$domains/repository-management/components/repository-header.svelte';
	import { createGetRepositoryQuery } from '$domains/repository-management/services/create-get-repository-query';
	import type { Branch, Repository } from '$services/common';
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

	const oneMinute = 60000;

	const listRepositoriesQuery = createListRepositoriesQuery();

	const path = $derived.by(() => {
		const repository = listRepositoriesQuery.data?.find((repository) => repository.id === id);
		return repository?.path;
	});

	const search = $derived(getSearchBranchesStore(id));

	// Create stable query input objects
	const selectedQueryInput = $derived({ repoId: id ?? '' });
	const lockedQueryInput = $derived({ repoId: id ?? '' });

	// Use queries for database-backed data
	const lockedQuery = $derived(createLockedBranchesQuery(lockedQueryInput));
	const selectedQuery = $derived(createSelectedBranchesQuery(selectedQueryInput));

	// Use different queries based on branchesType
	const getBranchesQuery = $derived(
		createGetRepositoryQuery(() => path, {
			staleTime: oneMinute
		})
	);

	const getDeletedBranchesQuery = $derived(
		branchesType === 'deleted' ? createListBranchesQuery(id ?? '', true) : undefined
	);

	$effect(() => {
		if (path && getBranchesQuery) {
			globalStore.lastUpdatedAt = new Date(getBranchesQuery.dataUpdatedAt);
		}
	});

	onDestroy(() => {
		clearInterval(interval);
		globalStore.lastUpdatedAt = undefined;
	});

	function update_repo() {
		if (path) {
			getBranchesQuery?.refetch().then((query) => {
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

	// Convert database branch format to frontend Branch format
	function convertDbBranchToFrontend(dbBranch: Record<string, unknown>): Branch {
		return {
			name: dbBranch.name as string,
			current: dbBranch.current as boolean,
			fullyMerged: dbBranch.fully_merged as boolean,
			lastCommit: {
				sha: dbBranch.last_commit_sha as string,
				shortSha: dbBranch.last_commit_short_sha as string,
				date: dbBranch.last_commit_date as string,
				message: dbBranch.last_commit_message as string,
				author: dbBranch.last_commit_author as string,
				email: dbBranch.last_commit_email as string
			},
			deletedAt: dbBranch.deleted_at as string | undefined,
			isReachable: dbBranch.is_reachable as boolean | undefined
		};
	}

	let branches = $derived.by(() => {
		const searchTerm = ensureString(search?.state).toLowerCase().trim();

		// For current branches, use the Git-based query
		if (branchesType === 'current' && getBranchesQuery?.data) {
			return getBranchesQuery.data.branches.filter((item: Branch) =>
				item.name.toLowerCase().trim().includes(searchTerm)
			);
		}

		// For deleted branches, use the database query
		if (branchesType === 'deleted' && getDeletedBranchesQuery?.data) {
			return getDeletedBranchesQuery.data.branches
				.map(convertDbBranchToFrontend)
				.filter((item: Branch) => item.name.toLowerCase().trim().includes(searchTerm));
		}

		return [];
	});

	$effect(() => {
		if (navigating) {
			// Reset page on navigation
		}
	});

	let selectibleCount = $derived.by(() => {
		if (!branches) {
			return 0;
		}

		// For deleted branches, all branches are selectable
		if (branchesType === 'deleted') {
			return branches.length;
		}

		// For current branches, filter out current branch and locked branches
		if (getBranchesQuery?.data) {
			return branches.filter(
				(item: Branch) =>
					item.name !== getBranchesQuery.data?.currentBranch &&
					(!lockedQuery.data?.branches.includes(item.name) || !allowLocking)
			).length;
		}

		return 0;
	});

	let searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(selectibleCount === 0 && isEmptyString(search?.state));

	const selectedSearchLength = $derived(
		branches?.filter((item: Branch) => selectedQuery.data?.branches.includes(item.name)).length ?? 0
	);

	// Get the current repository data from either query
	const currentRepoData = $derived.by(() => {
		if (branchesType === 'current') {
			return getBranchesQuery?.data;
		}
		// For deleted branches view, construct a minimal Repository object from repoInfo
		if (branchesType === 'deleted' && repoInfo) {
			return {
				id: repoInfo.id,
				name: repoInfo.name,
				currentBranch: repoInfo.currentBranch,
				path: listRepositoriesQuery.data?.find((r) => r.id === id)?.path ?? '',
				branchesCount: 0,
				branches: [] // Not used in deleted view
			} as Repository;
		}
		return undefined;
	});

	// Get the repository name and ID for deleted branches view
	const repoInfo = $derived.by(() => {
		if (branchesType === 'current' && getBranchesQuery?.data) {
			return {
				id: id, // Use the prop ID from URL params for consistent navigation
				name: getBranchesQuery.data.name,
				currentBranch: getBranchesQuery.data.currentBranch
			};
		}
		if (branchesType === 'deleted') {
			const repo = listRepositoriesQuery.data?.find((r) => r.id === id);
			return repo
				? {
						id: repo.id,
						name: repo.name,
						currentBranch: repo.current_branch
					}
				: undefined;
		}
		return undefined;
	});

	// Determine loading and error states
	const isLoading = $derived(
		branchesType === 'current' ? getBranchesQuery?.isLoading : getDeletedBranchesQuery?.isLoading
	);

	const isFetching = $derived(
		branchesType === 'current' ? getBranchesQuery?.isFetching : getDeletedBranchesQuery?.isFetching
	);

	const isError = $derived(
		branchesType === 'current' ? getBranchesQuery?.isError : getDeletedBranchesQuery?.isError
	);

	const error = $derived(
		branchesType === 'current' ? getBranchesQuery?.error : getDeletedBranchesQuery?.error
	);
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
					{selectibleCount}
					{selectedSearchLength}
					{branches}
					onSearch={() => {
						// Reset page on search
					}}
					onClearSearch={clearSearch}
					actionsSnippet={branchesType === 'deleted' ? restoreDeletedBranchModalSnippet : undefined}
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
						{branches}
						currentBranch={repoInfo.currentBranch}
						repositoryID={id}
						{allowLocking}
						{allowSelection}
						{allowSetCurrent}
					/>
				{/if}
			{/key}
			<!-- BRANCHES END -->
		</Loading>
	</main>
</div>
