<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Modal from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import Panel from '@pindoba/svelte-panel';
	import { createGetBranchesQuery } from '../core/composables/create-get-branches-query';
	import { createGetRepositoryListQuery } from '../core/composables/create-get-repository-list-query';
	import { type Branch } from '../core/models/branch';
	import { createDeleteBranchesMutation } from '$domains/branch-management/core/composables/create-delete-branches-mutation';
	import { getDeletedBranchesStore } from '$domains/branch-management/store/deleted-branches.svelte';
	import { notifications } from '$services/notifications/notifications.svelte';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { ensureString, formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		id?: string;
	}

	let open = $state(false);

	let { id }: Props = $props();

	const getRepositoryQuery = createGetRepositoryListQuery();

	const repository = $derived(getRepositoryQuery.data?.find((repo) => repo.id === id));
	const getBranchesQuery = createGetBranchesQuery(() => ({
		repoId: id ?? '',
		filters: { deletionStatus: 'active', selectionStatus: 'selected' }
	}));

	const selectedCount = $derived(getBranchesQuery.data?.branches.length);

	const deleteMutation = createDeleteBranchesMutation({
		// Await repository query invalidation to ensure UI is updated before closing modal
		queryInvalidation: {
			awaitInvalidates: [['repository', 'branche']]
		},
		onSuccess(data) {
			const m = data.deletedBranches
				.map((item) => {
					return formatString('- **{name}** (was {sha})', {
						name: ensureString(item.branch.name).trim(),
						sha: ensureString(item.branch.lastCommit.shortSha).trim()
					});
				})
				.join('\n\n');

			notifications.push({
				feedback: 'success',
				title: formatString('{type} deleted from {repo} repository', {
					type: data.deletedBranches.length > 1 ? 'Branches' : 'Branch',
					repo: ensureString(repository?.name)
				}),
				message: m
			});
		},
		meta: { showErrorNotification: true }
	});

	// current branch first
	function sort(a: Branch, b: Branch) {
		if (a.isCurrent()) {
			return -1;
		}
		if (b.isCurrent()) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	let branches = $derived([...(getBranchesQuery.data?.branches ?? [])].sort(sort));

	function handleDelete() {
		if (repository?.path && id) {
			deleteMutation.mutate(
				{
					path: repository.path,
					repoId: id,
					branches: branches.map((item) => item.getName())
				},
				{
					onSuccess: (data) => {
						// Log deleted branches to the deleted branches store
						const deletedBranchesStore = getDeletedBranchesStore(repository.id);
						if (deletedBranchesStore && repository.path) {
							data.deletedBranches.forEach((deletedBranch) => {
								deletedBranchesStore.addDeletedBranch(deletedBranch.branch);
							});
						}

						open = false;
					}
				}
			);
		}
	}

	function handleCancel() {
		open = false;
	}
</script>

<Modal
	bind:open
	title="Delete branches"
	aria-label="Delete branches"
	aria-describedby="Delete branches"
	data-testid="delete-branch-dialog"
	showCloseButton={!deleteMutation.isPending}
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
	<p data-testid="delete-branch-dialog-question">
		Are you sure you want these branches from the repository <strong
			class={css({
				color: 'danger',
				fontSize: 'lg'
			})}>{repository?.name}</strong
		>?
	</p>

	<Panel
		title="Branches to delete"
		aria-label="Branches to delete"
		aria-describedby="Branches to delete"
		radius="md"
		padding="none"
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'sm',
			maxHeight: '50vh',
			overflowY: 'auto',
			py: '1px'
		})}
	>
		{#each branches as branch (`${branch.getName()}-${branch.getLastCommit().getSha()}`)}
			<BranchCard {branch} selected={true} />
		{/each}
	</Panel>

	<div
		class={css({
			display: 'flex',
			justifyContent: 'flex-end',
			gap: 'md'
		})}
	>
		<Button
			emphasis="secondary"
			onclick={handleCancel}
			data-testid="cancel-button"
			disabled={deleteMutation.isPending}>Cancel</Button
		>
		<Loading loading={deleteMutation.isPending}
			><Button feedback="danger" autofocus onclick={handleDelete} data-testid="delete-button"
				>Delete</Button
			></Loading
		>
	</div>
</Modal>

<Button
	feedback="danger"
	size="sm"
	disabled={selectedCount === 0}
	class={css({
		whiteSpace: 'nowrap'
	})}
	onclick={() => {
		open = true;
	}}
	data-testid="open-dialog-button"
>
	Delete ({selectedCount})
	{#snippet leading()}
		<Icon icon="ion:trash-outline" width="16px" height="16px" />
	{/snippet}
</Button>
