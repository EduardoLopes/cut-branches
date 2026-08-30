<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createDeleteRepositoryMutation } from '../infrastructure/mutations/create-delete-repository-mutation';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { resolveRepositoryPath } from '$lib/repository-route';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { portal } from '$utils/portal-action';
	import { formatString, ensureString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repositoryId: string;
		/** Bindable visibility, controlled by the repository options menu. */
		open?: boolean;
	}

	let { repositoryId, open = $bindable(false) }: Props = $props();

	const queryClient = useQueryClient();
	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));

	// Query for repositories list
	const repositoriesQuery = createGetRepositoryListQuery();
	const repositories = $derived(repositoriesQuery.data ?? []);

	const deleteRepositoryMutation = createDeleteRepositoryMutation({
		onSuccess: async () => {
			const repoName = ensureString(getRepositoryQuery.data?.name);

			await leaveRemovedRepository();
			open = false;

			// Show notification about repository removal
			notifications.push({
				title: 'Repository removed',
				message: formatString('The repository {name} has been removed', { name: repoName }),
				feedback: 'success'
			});
		},
		onError: async (error) => {
			// `repository_not_found` means the row is already gone — the route we are
			// sitting on is just as dead as it would be after a success, so leave it
			// the same way. Any other failure leaves the repository (and its route)
			// intact; the error notification explains what happened.
			if (error?.kind === 'repository_not_found') {
				await leaveRemovedRepository();
			}

			open = false;
		},
		meta: { showErrorNotification: true }
	});

	/** Drops the removed repository's cache and moves off its now-dead route. */
	async function leaveRemovedRepository() {
		const deletedId = repositoryId;

		if (deletedId) {
			queryClient.cancelQueries({ queryKey: ['repository', 'getRepository', { id: deletedId }] });
			queryClient.removeQueries({ queryKey: ['repository', 'getRepository', { id: deletedId }] });
		}

		const otherRepository = repositories.find((repository) => repository.id !== deletedId);

		if (otherRepository) {
			await goto(resolveRepositoryPath(otherRepository.id));
		} else {
			await goto(resolve('/repos'));
		}
	}

	function handleRemove() {
		// The button is already marked disabled while the mutation runs, but the
		// underlying control still fires clicks, so guard the second submit here.
		if (deleteRepositoryMutation.isPending) {
			return;
		}

		const repoId = repositoryId;

		if (!repoId) {
			open = false;
			notifications.push({
				title: 'Error',
				message: 'Repository ID is missing',
				feedback: 'danger'
			});
			return;
		}

		// The dialog stays up until the mutation settles: closing first would strand
		// the user on the repository's route with nothing but a toast if it failed.
		deleteRepositoryMutation.mutate({ id: repoId });
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
		showCloseButton={!deleteRepositoryMutation.isPending}
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
