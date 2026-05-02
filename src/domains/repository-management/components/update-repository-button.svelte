<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createGetRepositoryListQuery } from '$domains/onboarding/core/composables/create-get-repository-list-query';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { hasRepoId, hasPath } from '$utils/query-type-guards';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	const queryClient = useQueryClient();
	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repo) => repo.id === repositoryId)
	);

	let isRefreshing = $state(false);

	async function handleUpdate() {
		isRefreshing = true;

		try {
			// Invalidate all branch queries for this repository
			await queryClient.invalidateQueries({
				predicate: (query) => {
					const [resource, commandName, input] = query.queryKey;
					return (
						resource === 'branch' &&
						commandName === 'getBranchList' &&
						hasRepoId(input) &&
						input.repoId === repositoryId
					);
				}
			});

			// Invalidate repository query for this specific repository
			await queryClient.invalidateQueries({
				predicate: (query) => {
					const [resource, commandName, input] = query.queryKey;
					return resource === 'repository' && commandName === 'getRepository' && hasPath(input);
				}
			});

			const repoName = repository?.name ?? 'Repository';
			notifications.push({
				title: 'Repository updated',
				message: `The repository **${repoName}** was updated`,
				feedback: 'success'
			});
		} finally {
			isRefreshing = false;
		}
	}
</script>

<Loading loading={isRefreshing} passThrough={{ root: { style: css.raw({ width: 'full' }) } }}>
	<Button
		emphasis="secondary"
		size="sm"
		onclick={handleUpdate}
		disabled={isRefreshing}
		title="Update repository"
		aria-label="Update repository"
		aria-describedby="Update repository"
		data-testid="update-button"
	>
		Update
		{#snippet trailing()}
			<Icon icon="lucide:refresh-cw" width="16px" height="16px" />
		{/snippet}
	</Button>
</Loading>
