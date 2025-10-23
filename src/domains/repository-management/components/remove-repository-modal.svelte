<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createDeleteRepositoryMutation } from '../logic/application/mutations/create-delete-repository-mutation';
	import { createGetRepositoryQuery } from '../logic/application/queries/create-get-repository-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createClearLockedBranchesMutation } from '$domains/branch-management/core/composables/createLockedBranchesMutations';
	import { createSetBranchSelectionAllMutation } from '$domains/branch-management/core/composables/createSelectedBranchesMutations';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import { formatString, ensureString } from '$utils/string-utils';
	import { debounce } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		repositoryId: string;
	}

	let open = $state(false);

	let { repositoryId }: Props = $props();

	const queryClient = useQueryClient();
	const search = $derived(getSearchBranchesStore(repositoryId));
	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));

	// Query for repositories list
	const repositoriesQuery = createGetRepositoryListQuery();
	const repositories = $derived(repositoriesQuery.data ?? []);

	// Mutations for clearing database data
	const setSelectionAllMutation = createSetBranchSelectionAllMutation();
	const clearLockedMutation = createClearLockedBranchesMutation();
	const deleteRepositoryMutation = createDeleteRepositoryMutation({
		onSuccess: async () => {
			const repoName = ensureString(getRepositoryQuery.data?.name);
			const deletedId = repositoryId;

			// Clear UI stores
			search?.clear();

			// Cancel and remove queries for the deleted repository
			// This prevents get_repository from being called on the deleted repo
			if (deletedId) {
				queryClient.cancelQueries({ queryKey: ['getRepository', { id: deletedId }] });
				queryClient.removeQueries({ queryKey: ['getRepository', { id: deletedId }] });
			}

			// Invalidate repositories list so it refreshes
			queryClient.invalidateQueries({ queryKey: ['getRepositoryList'] });

			// Find another repository to navigate to using current list
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

		// Clear database entries for this repository
		// Note: setSelectionAllMutation and clearLockedMutation will be auto-deleted via CASCADE
		// but we call them explicitly to be defensive
		setSelectionAllMutation.mutate({ repoId, isSelected: false, deletionStatus: 'all' });
		clearLockedMutation.mutate({ repoId });
		deleteRepositoryMutation.mutate({ id: repoId });
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog
	bind:open
	title="Remove repository"
	aria-label="Remove repository"
	aria-describedby="Remove repository"
	data-testid="remove-modal"
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
		<Button emphasis="secondary" onclick={handleCancel} data-testid="cancel-remove">Cancel</Button>
		<Button feedback="danger" autofocus onclick={handleRemove} data-testid="confirm-remove"
			>Remove</Button
		>
	</div>
</Dialog>

<Button
	emphasis="ghost"
	size="md"
	feedback="danger"
	onclick={debounce(() => {
		open = true;
	}, 200)}
	shape="square"
	data-testid="open-remove-modal"
>
	<Icon icon="lucide:circle-x" width="20px" height="20px" />
	<span class={visuallyHidden()}>Remove</span>
</Button>
