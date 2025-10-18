<script lang="ts">
	import { page } from '$app/state';
	import DeletedBranchesView from '$domains/branch-management/views/deleted-branches-view.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import RepositoryHeaderBackButton from '$domains/repository-management/components/repository-header-back-button.svelte';
	import { getBranchListQuery } from '$domains/repository-management/logic/application/queries/get-branch-list-query';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/panda/css';

	const id = $derived(page.params.id ?? '');

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === id)
	);

	const deletedBranchesQuery = getBranchListQuery(
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

	const isLoading = $derived(deletedBranchesQuery?.isLoading ?? false);
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository
		{id}
		{isLoading}
		defaultTitle={`Restore branches from ${repository?.name?.toLocaleUpperCase() ?? ''}`}
	>
		{#snippet leftActions()}
			<RepositoryHeaderBackButton repositoryId={id} />
		{/snippet}

		<DeletedBranchesView {id} />
	</Repository>
</div>
