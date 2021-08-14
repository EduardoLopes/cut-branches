<script lang="ts">
	import { repos, currentRepo, loadingRepoInfo } from '$lib/stores';
	import type { Repo } from '$lib/stores';
	import AddRepo from '$lib/AddRepo/index.svelte';
	import { onMount } from 'svelte';
	import { getRepoInfo, toast } from '$lib/utils';

	export let sortBy = 'BRANCH_COUNT';

	function handleSort(a: Repo, b: Repo) {
		if (sortBy === 'BRANCH_COUNT') {
			// TODO
		}

		return a.name.localeCompare(b.name);
	}

	function handleOnClick(repo: Repo) {
		$currentRepo = repo;
		$loadingRepoInfo = true;
		getRepoInfo(repo.path)
			.then((res: Repo) => {
				$repos = [...$repos.filter((item) => item.path !== res.path), res];
				$currentRepo = res;
			})
			.catch((errors: string[]) => {
				errors.reverse().forEach((item) => toast.failure(item));
			})
			.finally(() => {
				$loadingRepoInfo = false;
			});
	}

	onMount(async () => {});
</script>

<div class="container">
	<div class="logo">Cut Branches</div>
	<div class="content">
		{#if $repos}
			<ul class="menu">
				{#each $repos.sort(handleSort) as repo (repo.name)}
					<li>
						<button
							on:click={() => handleOnClick(repo)}
							class:current={$currentRepo.name === repo.name}
							>{repo.name}<span class="count">{repo.branches.length}</span></button
						>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<div class="add-more">
		<AddRepo />
	</div>
</div>

<style>
	.container {
		display: grid;
		grid-template-rows: min-content auto min-content;
		background: var(--color-primary-1);
		height: 100vh;
		border-right: 1px dashed var(--color-primary);
	}

	.content {
		border: 1px dashed var(--color-primary);
		border-right-width: 0;
		border-left-width: 0;
	}

	.logo {
		padding: 16px;
		text-align: center;
		color: #fff;
		font-size: 1.2em;
	}

	.menu {
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.8em;
		height: 100%;
	}

	.menu li button {
		width: 100%;
		border: none;
		padding: 8px 16px;
		background: none;
		text-align: left;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px dashed var(--color-primary);
	}

	.menu li button:hover {
		background: var(--color-primary-1);
		filter: contrast(1.3);
		cursor: pointer;
	}

	.menu li button.current {
		background: var(--color-primary-1);
		filter: contrast(1.2);
	}

	.menu li button:hover.current {
		background: var(--color-primary-1);
		filter: contrast(1.3);
	}

	.menu li button span {
		cursor: pointer;
		margin-left: 32px;
		background: var(--color-primary-2);
		padding: 4px;
		font-size: 0.8em;
	}
</style>
