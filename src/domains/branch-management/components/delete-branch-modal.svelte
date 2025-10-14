<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { type ButtonProps } from '@pindoba/svelte-button';
	import Modal from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import { createGetBranchesQuery } from '../logic/application/queries/create-get-branches-query';
	import { createGetRepositoryListQuery } from '../logic/application/queries/create-get-repository-list-query';
	import { createDeleteBranchesMutation } from '$domains/branch-management/services/createDeleteBranchesMutation';
	import { createClearSelectedBranchesMutation } from '$domains/branch-management/services/createSelectedBranchesMutations';
	import { createSelectedBranchesQuery } from '$domains/branch-management/services/createSelectedBranchesQuery';
	import { getDeletedBranchesStore } from '$domains/branch-management/store/deleted-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import type { Branch } from '$lib/bindings';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { ensureString, formatString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id?: string;
		buttonProps?: Omit<ButtonProps, 'onclick'>;
	}

	let open = $state(false);

	let { id, buttonProps }: Props = $props();

	const selectedQueryInput = $derived({ repoId: id ?? '', branchContext: 'current' });

	const getRepositoryQuery = $derived(createGetRepositoryListQuery());

	const repository = $derived(getRepositoryQuery.data?.find((repo) => repo.id === id));
	const selectedQuery = $derived(createSelectedBranchesQuery(selectedQueryInput));
	const getBranchesQuery = $derived(
		createGetBranchesQuery({ repoId: id ?? '', includeDeleted: false })
	);
	// No need for manual invalidation - automatic invalidation handles it
	const clearSelectedMutation = $derived(createClearSelectedBranchesMutation());

	const selectedCount = $derived(selectedQuery.data?.branches.length);

	const deleteMutation = $derived(
		createDeleteBranchesMutation({
			// Await repository query invalidation to ensure UI is updated before closing modal
			queryInvalidation: {
				awaitInvalidates: [['repository']]
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

				// Clear selected branches in database - invalidation happens automatically
				if (id) {
					clearSelectedMutation.mutate({ repoId: id, branchContext: 'current' });
				}
			},
			meta: { showErrorNotification: true }
		})
	);

	// current branch first
	function sort(a: Branch, b: Branch) {
		if (a.current) {
			return -1;
		}
		if (b.current) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	let branches = $derived(
		[...(getBranchesQuery.data?.branches ?? [])]
			.sort(sort)
			.filter((item) => selectedQuery.data?.branches.includes(item.name))
	);

	function handleDelete() {
		if (repository?.path && id) {
			deleteMutation.mutate(
				{
					path: repository.path,
					repoId: id,
					branches: branches.map((item) => item.name)
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
>
	<p data-testid="delete-branch-dialog-question">
		Are you sure you want these branches from the repository <strong
			class={css({
				color: 'danger.800',
				fontSize: 'lg'
			})}>{repository?.name}</strong
		>?
	</p>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'sm',
			maxHeight: '50vh',
			overflowY: 'auto'
		})}
	>
		{#each branches as branch (`${branch.name}-${branch.lastCommit.sha}`)}
			<BranchCard {branch} selected={true} />
		{/each}
	</div>

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
		<Loading isLoading={deleteMutation.isPending}
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
	onclick={() => {
		open = true;
	}}
	{...buttonProps}
	data-testid="open-dialog-button"
>
	<Icon icon="ion:trash-outline" width="16px" height="16px" />
	Delete
</Button>
