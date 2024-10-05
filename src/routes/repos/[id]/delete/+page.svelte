<script lang="ts">
	import type { IBranch, IRepo, RepoID } from '$lib/stores';
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Button from '$lib/primitives/Button/index.svelte';
	import Branch from '$lib/Branch/index.svelte';
	import Icon from '@iconify/svelte';
	import { useDeleteBranchesMutation } from '$lib/services/useDeleteBranchesMutation';
	import { toast } from '$lib/primitives/Toast.svelte';
	import { useQueryClient } from '@tanstack/svelte-query';
	const client = useQueryClient();

	let id = $page.params.id;

	let currentRepo: RepoID | undefined;
	const deleteMutation = useDeleteBranchesMutation({
		onSuccess(data) {
			toast.success({
				message: `${data.length > 1 ? 'Branches' : 'Branch'} deleted`,
				description: data
					.map((item) => {
						const s = item.replace('Deleted branch', '').split(' (was');
						return `<strong>${s[0].trim()}</strong> (was ${s[1].trim()}`;
					})
					.join('<br />')
			});

			client.invalidateQueries({ queryKey: ['branches', 'get-all', currentRepo?.path] });
		},
		onError(error) {
			toast.danger({ message: error.message, description: error.description });
		}
	});

	onMount(() => {
		currentRepo = $repos.filter((item) => item.id === id)[0];
	});

	$: selected = history.state.branches as IBranch[];

	function handleYes() {
		if (selected && currentRepo) {
			$deleteMutation.mutate({
				path: currentRepo?.path,
				branches: selected
			});
		}
		goto(`/repos/${id}`);
	}

	function handleNo() {
		goto(`/repos/${id}`);
	}
</script>

<div class="container">
	<div class="header">
		<h1>{currentRepo?.name}</h1>
	</div>

	{#if selected}
		<div class="branches">
			{#each selected as branch}
				<Branch data={branch} />
			{/each}
		</div>
	{/if}

	<div class="question">
		<p>
			<strong
				>Are you sure do you wanna delete these branches from the repository <span class="uppercase"
					>{currentRepo?.name}</span
				>?</strong
			>
		</p>
		<div class="buttons">
			<Button variant="secondary" on:click={handleNo}>No</Button>
			<Button feedback="danger" on:click={handleYes}>
				<Icon icon="ion:trash-outline" width="20px" height="20px" color="#fff" /> Delete {selected.length ===
				1
					? 'branch'
					: 'branches'}
			</Button>
		</div>
	</div>
</div>

<style lang="scss">
	.container {
		display: flex;
		background: #e9e9e7;
		background: rgba(255, 255, 255, 0.5);
		flex-direction: column;
		height: 100vh;
	}

	.uppercase {
		text-transform: uppercase;
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: var(--color-danger-8);
		top: 0;
		box-shadow: 0px 2px 2px 0px rgb(0 0 0 / 8%);
		color: #fff;
		flex-shrink: 0;

		h1 {
			font-size: 1.3em;
			margin: 0;
			text-align: left;
			text-transform: uppercase;
			font-weight: bold;
			padding: 1.6rem;
		}
	}

	.branches {
		display: flex;
		gap: 1.6rem;
		flex-direction: column;
		padding: 1.6rem;
		overflow-y: auto;
		height: min-content;
		flex-grow: 1;
	}

	.question {
		padding: 1.6rem;
		text-align: center;
		border-top: 1px dashed var(--color-gray-1);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		margin-top: auto;
		flex-shrink: 0;
		height: 30vh;

		.buttons {
			display: flex;
			gap: 1.6rem;
			justify-content: center;

			:global(button) {
				min-width: 10.6rem;
				justify-content: center;
				text-align: center;
				font-weight: bold;
			}
		}

		p {
			margin-top: 0;
		}
	}
</style>
