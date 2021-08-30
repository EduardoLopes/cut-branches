<script lang="ts">
	import { repos, currentRepo, loadingRepoInfo } from '$lib/stores';
	import type { IRepo } from '$lib/stores';
	import AddRepo from '$lib/AddRepo/index.svelte';
	import { onMount } from 'svelte';

	export let sortBy = 'BRANCH_COUNT';

	function handleSort(a: IRepo, b: IRepo) {
		if (sortBy === 'BRANCH_COUNT') {
			// TODO
		}

		return a.name.localeCompare(b.name);
	}

	function handleOnClick(repo: IRepo) {
		$currentRepo = repo;
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

<style src="./styles.scss" lang="scss"></style>
