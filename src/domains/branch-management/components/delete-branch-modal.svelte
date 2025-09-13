<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import { type ButtonProps } from '@pindoba/svelte-button';
	import Modal from '@pindoba/svelte-dialog';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import BranchComponent from '$domains/branch-management/components/branch.svelte';
	import { createDeleteBranchesMutation } from '$domains/branch-management/services/createDeleteBranchesMutation';
	import { getDeletedBranchesStore } from '$domains/branch-management/store/deleted-branches.svelte';
	import { getSelectedBranchesStore } from '$domains/branch-management/store/selected-branches.svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import type { Branch } from '$services/common';
	import { ensureString, formatString } from '$utils/string-utils';
	import { css } from '@pindoba/panda/css';

	const client = useQueryClient();
	interface Props {
		id?: string;
		buttonProps?: Omit<ButtonProps, 'onclick'>;
	}

	let open = $state(false);

	let { id, buttonProps }: Props = $props();
	const selected = $derived(getSelectedBranchesStore(id));
	const repository = $derived(getRepositoryStore(id));
	const selectedCount = $derived(selected?.list.length);

	const deleteMutation = createDeleteBranchesMutation({
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
					repo: ensureString(repository?.state?.name)
				}),
				message: m
			});

			selected?.clear();

			// Force a complete refresh of the repository data
			return client.invalidateQueries({
				queryKey: ['branches', 'get-all', repository?.state?.path]
			});
		},
		meta: { showErrorNotification: true }
	});

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
		[...(repository?.state?.branches ?? [])].sort(sort).filter((item) => selected?.has(item.name))
	);

	function handleDelete() {
		if (repository?.state?.path) {
			deleteMutation.mutate(
				{
					path: repository.state.path,
					branches: branches.map((item) => item.name)
				},
				{
					onSuccess: (data) => {
						// Log deleted branches to the deleted branches store
						const deletedBranchesStore = getDeletedBranchesStore(repository.state?.id);
						if (deletedBranchesStore && repository.state?.path) {
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
			})}>{repository?.state?.name}</strong
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
			<div
				class={css({
					position: 'relative',
					display: 'grid',
					gridTemplateColumns: 'auto',
					gap: 'md',
					borderRadius: 'sm'
				})}
			>
				<BranchComponent data={branch} selected={selected?.has(branch.name)} />
			</div>
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
