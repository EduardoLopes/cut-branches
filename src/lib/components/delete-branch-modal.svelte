<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import { useQueryClient } from '@tanstack/svelte-query';
	import BranchComponent from '$lib/components/branch.svelte';
	import { createDeleteBranchesMutation } from '$lib/services/createDeleteBranchesMutation';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore, type Branch } from '$lib/stores/repository.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
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
			const m = data
				.map((item) => {
					const s = item.replace('Deleted branch', '').split(' (was');
					return `- **${s[0].trim()}** (was ${s[1].trim()}`;
				})
				.join('\n\n');
			notifications.push({
				feedback: 'success',
				title: `${data.length > 1 ? 'Branches' : 'Branch'} deleted from ${
					repository?.state?.name
				} repository`,
				message: m
			});

			selected?.clear();

			client.invalidateQueries({ queryKey: ['branches', 'get-all', repository?.state?.path] });
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
			deleteMutation.mutate({
				path: repository?.state?.path,
				branches: branches.map((item) => item)
			});
		}

		open = false;
	}

	function handleCancel() {
		open = false;
	}
</script>

<Dialog
	bind:open
	title="Delete branches"
	aria-label="Delete branches"
	aria-describedby="Delete branches"
	data-testid="delete-branch-dialog"
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
		{#each branches as branch (branch.name)}
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
		<Button emphasis="secondary" onclick={handleCancel} data-testid="cancel-button">Cancel</Button>
		<Button feedback="danger" autofocus onclick={handleDelete} data-testid="delete-button"
			>Delete</Button
		>
	</div>
</Dialog>

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
