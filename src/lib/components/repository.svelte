<script lang="ts">
	import Loading from '@pindoba/svelte-loading';
	import { onDestroy } from 'svelte';
	import { navigating } from '$app/state';
	import BranchList from '$lib/components/branch-list.svelte';
	import BulkActions from '$lib/components/branches-bulk-actions.svelte';
	import EmptyState from '$lib/components/empty-state.svelte';
	import ErrorMessage from '$lib/components/error-message.svelte';
	import RepositoryHeader from '$lib/components/repository-header.svelte';
	import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
	import { globalStore } from '$lib/stores/global-store.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id?: string;
	}
	const { id }: Props = $props();

	const oneMinute = 60000;

	const repository = $derived(getRepositoryStore(id));
	const search = $derived(getSearchBranchesStore(id));
	const locked = $derived(getLockedBranchesStore(id));
	const selected = $derived(getSelectedBranchesStore(id));

	const getBranchesQuery = createGetRepositoryByPathQuery(() => repository?.state?.path, {
		staleTime: oneMinute
	});

	$effect(() => {
		if (repository?.state?.path) {
			globalStore.lastUpdatedAt = new Date(getBranchesQuery.dataUpdatedAt);
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

	function clearSearch() {
		search?.clear();
	}

	let branches = $derived(
		repository?.state
			? repository?.state?.branches.filter((item) =>
					item.name
						.toLowerCase()
						.trim()
						.includes((search?.state ?? '').toLowerCase().trim())
				)
			: []
	);

	$effect(() => {
		if (navigating) {
			// Reset page on navigation
		}
	});

	let selectibleCount = $derived.by(() => {
		if (!branches || !repository?.state) {
			return 0;
		}
		return branches.filter(
			(item) => item.name !== repository?.state?.currentBranch && !locked?.has(item.name)
		).length;
	});

	let searchNoResultsFound = $derived((search?.state?.length ?? 0) > 0 && branches?.length === 0);

	let interval = $state<number | undefined>();

	onDestroy(() => {
		clearInterval(interval);
	});

	const hasNoBranchesToDelete = $derived(
		selectibleCount === 0 && (search?.state ?? '')?.length === 0
	);

	const selectedSearchLength = $derived(
		branches?.filter((item) => selected?.has(item.name)).length ?? 0
	);
</script>

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)',
		padding: 'md',
		pl: 0
	})}
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
				repositoryId={repository?.state.id}
				isLoading={getBranchesQuery.isFetching}
				onUpdate={update_repo}
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

			{#if !hasNoBranchesToDelete}
				<BulkActions
					currentRepo={repository?.state}
					{selectibleCount}
					{selectedSearchLength}
					{branches}
					onSearch={() => {
						// Reset page on search
					}}
					onClearSearch={clearSearch}
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

			{#if hasNoBranchesToDelete}
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

			{#if repository?.state?.branches.length === 0}
				<EmptyState message="This repository has no branches!" icon="mdi:source-branch-remove" />
			{/if}

			<!-- BRANCHES -->
			{#key `${id}`}
				{#if repository?.state && !getBranchesQuery.isError && !searchNoResultsFound && repository?.state?.branches.length > 0}
					<BranchList
						{branches}
						currentBranch={repository?.state?.currentBranch}
						repositoryID={id}
					/>
				{/if}
			{/key}
			<!-- BRANCHES END -->
		</Loading>
	</main>
</div>
