<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import { hasRepoId, hasPath } from '$utils/query-type-guards';

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

<Loading isLoading={isRefreshing}>
	<Button
		emphasis="ghost"
		size="md"
		onclick={handleUpdate}
		disabled={isRefreshing}
		title="Update repository"
		aria-label="Update repository"
		aria-describedby="Update repository"
		shape="square"
		data-testid="update-button"
	>
		<Icon icon="lucide:refresh-cw" width="20px" height="20px" />
	</Button>
</Loading>
