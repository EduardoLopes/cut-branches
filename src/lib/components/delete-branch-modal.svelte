<script lang="ts">
	import { type IBranch, type RepoID } from '$lib/stores/branches';
	import Icon from '@iconify/svelte';
	import { css } from '@pindoba/panda/css';
	import Button from '@pindoba/svelte-button';
	import Dialog from '@pindoba/svelte-dialog';
	import { createSelected, selected } from '$lib/stores/selected';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import Branch from '$lib/components/branch.svelte';
	import { useDeleteBranchesMutation } from '$lib/services/useDeleteBranchesMutation';
	import { createNotifications } from '$lib/stores/notifications';
	import { useQueryClient } from '@tanstack/svelte-query';

	const client = useQueryClient();
	const notifications = createNotifications();
	interface Props {
		currentRepo: RepoID;
	}

	let open = $state(false);

	let { currentRepo }: Props = $props();
	const selectedManager = $derived(createSelected(currentRepo.id));
	const oneMinute = 60000;
	const selectedList = $derived(currentRepo.id ? ($selected[currentRepo.id] ?? []) : []);
	let currentPath = $derived(currentRepo?.path);
	const getBranchesQuery = getRepoByPath(() => currentPath ?? history.state.path, {
		staleTime: oneMinute,
		meta: {
			showErrorNotification: false
		}
	});

	const selectedCount = $derived(selectedList.length);

	const deleteMutation = useDeleteBranchesMutation({
		onSuccess(data) {
			notifications.push({
				feedback: 'success',
				title: `${data.length > 1 ? 'Branches' : 'Branch'} deleted from ${
					currentRepo.name
				} repository`,
				message: data
					.map((item) => {
						const s = item.replace('Deleted branch', '').split(' (was');
						return `<strong>${s[0].trim()}</strong> (was ${s[1].trim()}`;
					})
					.join('<br />')
			});

			selectedManager.clear();

			client.invalidateQueries({ queryKey: ['branches', 'get-all', currentRepo?.path] });
		}
	});

	let branches = $derived(
		getBranchesQuery.data
			? [...getBranchesQuery.data.branches]
					.sort(sort)
					.filter((item) => selectedList.includes(item.name))
			: []
	);

	// current branch first
	function sort(a: IBranch, b: IBranch) {
		if (a.current) {
			return -1;
		}
		if (b.current) {
			return 1;
		}
		// a must be equal to b
		return 0;
	}

	function handleDelete() {
		deleteMutation.mutate({
			path: currentRepo?.path,
			branches:
				getBranchesQuery.data?.branches
					.sort(sort)
					.filter((item) => selectedList.includes(item.name)) ?? []
		});

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
			})}>{currentRepo?.name}</strong
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
				<Branch data={branch} selected={selectedList.includes(branch.name)} />
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
>
	<Icon icon="ion:trash-outline" width="16px" height="16px" />
	Delete
</Button>
