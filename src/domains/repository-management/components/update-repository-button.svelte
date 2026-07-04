<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { hasRepoId, hasPath } from '$infrastructure/query-type-guards';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
		/**
		 * Re-attaches the filesystem watch and forces a refresh. Provided by the
		 * watch composable; when present it supersedes the local invalidation
		 * (which remains as a standalone fallback).
		 */
		onRefresh?: () => Promise<void>;
	}

	const { repositoryId, onRefresh }: Props = $props();

	const queryClient = useQueryClient();
	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repo) => repo.id === repositoryId)
	);

	let isRefreshing = $state(false);

	async function handleUpdate() {
		isRefreshing = true;

		try {
			if (onRefresh) {
				// Re-attach the watch and refresh in one step.
				await onRefresh();
			} else {
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
			}

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
		emphasis="ghost"
		size="md"
		onclick={handleUpdate}
		disabled={isRefreshing}
		title="Update repository"
		aria-label="Update repository"
		aria-describedby="Update repository"
		data-testid="update-button"
	>
		Update
		{#snippet trailing()}
			<Stamp emphasis="ghost" border="none" background="transparent">
				<Icon icon="lucide:refresh-cw" width="16px" height="16px" />
			</Stamp>
		{/snippet}
	</Button>
</Loading>
