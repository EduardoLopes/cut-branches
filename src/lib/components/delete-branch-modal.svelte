<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { page } from '$app/stores';
	import BranchComponent from '$lib/components/branch.svelte';
	import { useDeleteBranchesMutation } from '$lib/services/useDeleteBranchesMutation';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore, type Branch } from '$lib/stores/repository.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { css } from '@pindoba/panda/css';

	const client = useQueryClient();
	interface Props {
		buttonProps?: Omit<ButtonProps, 'onclick'>;
	}

	let open = $state(false);

	let { buttonProps }: Props = $props();
	const selected = $derived(getSelectedBranchesStore($page.params.id));
	const repository = $derived(getRepositoryStore($page.params.id));
	const selectedCount = $derived(selected?.list.length);

	const deleteMutation = useDeleteBranchesMutation({
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
>
	<p>
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
		{#each branches as branch}
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
		<Button emphasis="secondary" onclick={handleCancel}>Cancel</Button>
		<Button feedback="danger" autofocus onclick={handleDelete}>Delete</Button>
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
>
	<Icon icon="ion:trash-outline" width="16px" height="16px" />
	Delete
</Button>
