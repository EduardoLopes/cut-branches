<script lang="ts">
	import { page } from '$app/state';
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import RemoveRepositoryModal from '$domains/repository-management/components/remove-repository-modal.svelte';
	import RepositoryHeaderRestoreButton from '$domains/repository-management/components/repository-header-restore-button.svelte';
	import RepositoryHeaderUpdateButton from '$domains/repository-management/components/repository-header-update-button.svelte';
	import { createGetRepositoryQuery } from '$domains/repository-management/logic/application/queries/create-get-repository-query';
	import { getBranchListQuery } from '$domains/repository-management/logic/application/queries/get-branch-list-query';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/panda/css';

	const id = $derived(page.params.id ?? '');

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === id)
	);

	const path = $derived.by(() => {
		return repository?.path;
	});

	const getRepositoryQuery = createGetRepositoryQuery(() => path);

	const currentBranchesQuery = getBranchListQuery(
		() => ({
			repoId: id ?? '',
			filters: { deletionStatus: 'active', includeCurrent: true }
		}),
		{
			enabled: () => !!id
		}
	);

	const isLoading = $derived(currentBranchesQuery?.isLoading ?? false);
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository {id} {isLoading}>
		{#snippet rightActions()}
			<RepositoryHeaderRestoreButton repositoryId={id} />
			<RepositoryHeaderUpdateButton repositoryId={id} />
			{#if getRepositoryQuery.data}
				<RemoveRepositoryModal currentRepo={getRepositoryQuery.data} />
			{/if}
		{/snippet}

		<ActiveBranchesView {id} />
	</Repository>
</div>
