<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import Stamp from '@pindoba/svelte-stamp';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createDeleteRepositoryMutation } from '../core/composables/mutations/create-delete-repository-mutation';
	import { createGetRepositoryListQuery } from '../core/composables/queries/create-get-repository-list-query';
	import { createGetRepositoryQuery } from '../core/composables/queries/create-get-repository-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { portal } from '$utils/portal-action';
	import { formatString, ensureString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
	}

	let open = $state(false);

	let { repositoryId }: Props = $props();

	const queryClient = useQueryClient();
	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));

	// Query for repositories list
	const repositoriesQuery = createGetRepositoryListQuery();
	const repositories = $derived(repositoriesQuery.data ?? []);

	const deleteRepositoryMutation = createDeleteRepositoryMutation({
		onSuccess: async () => {
			const repoName = ensureString(getRepositoryQuery.data?.name);
			const deletedId = repositoryId;

			if (deletedId) {
				queryClient.cancelQueries({ queryKey: ['repository', 'getRepository', { id: deletedId }] });
				queryClient.removeQueries({ queryKey: ['repository', 'getRepository', { id: deletedId }] });
			}

			const otherRepository = repositories.find((repository) => repository.id !== deletedId);

			// Navigate away immediately
			if (otherRepository) {
				await goto(resolve(`/repos/${otherRepository.name}`));
			} else {
				await goto(resolve(`/get-started`));
			}

			// Show notification about repository removal
			notifications.push({
				title: 'Repository removed',
				message: formatString('The repository {name} has been removed', { name: repoName }),
				feedback: 'success'
			});
		},
		meta: { showErrorNotification: true }
	});

	function handleRemove() {
		open = false;

		const repoId = repositoryId;

		if (!repoId) {
			notifications.push({
				title: 'Error',
				message: 'Repository ID is missing',
				feedback: 'danger'
			});
			return;
		}

		deleteRepositoryMutation.mutate({ id: repoId });
	}

	function handleOpen() {
		open = true;
	}

	function handleCancel() {
		open = false;
	}
</script>

<div use:portal>
	<Dialog
		bind:open
		title="Remove repository"
		aria-label="Remove repository"
		aria-describedby="Remove repository"
		data-testid="remove-modal"
		passThrough={{
			content: {
				style: css.raw({
					display: 'flex',
					flexDirection: 'column',
					gap: 'md'
				})
			}
		}}
	>
		<p>
			Are you sure you want to remove the repository <strong
				class={css({
					color: 'danger.800',
					fontSize: 'lg'
				})}>{getRepositoryQuery.data?.name ?? repositoryId}</strong
			>?
		</p>

		<div
			class={css({
				display: 'flex',
				justifyContent: 'flex-end',
				gap: 'md'
			})}
		>
			<Button emphasis="secondary" onclick={handleCancel} data-testid="cancel-remove">Cancel</Button
			>
			<Button feedback="danger" autofocus onclick={handleRemove} data-testid="confirm-remove"
				>Remove</Button
			>
		</div>
	</Dialog>
</div>

<Button
	emphasis="ghost"
	size="md"
	feedback="danger"
	onclick={handleOpen}
	data-testid="open-remove-modal"
	passThrough={{
		root: {
			style: css.raw({
				gap: 'xs',
				justifyContent: 'space-between',
				width: 'full'
			})
		}
	}}
>
	Remove
	{#snippet trailing()}
		<Stamp emphasis="ghost" feedback="danger" border="none" background="transparent">
			<Icon icon="lucide:circle-x" width="16px" height="16px" />
		</Stamp>
	{/snippet}
</Button>
