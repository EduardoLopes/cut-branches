<script lang="ts">
	import { currentRepo } from '$lib/stores';
	import { onMount } from 'svelte';

	onMount(async () => {});
</script>

<main class="container">
	<h1>{$currentRepo.name}</h1>

	<div class="branches">
		{#if $currentRepo.branches}
			{#each $currentRepo.branches as branch (branch)}
				<div class="branch">{branch}</div>
			{/each}
		{/if}
	</div>
</main>

<style>
	.container {
		background: #e9e9e7;
		padding: 16px;
		height: 100vh;
		overflow: hidden;
	}

	h1 {
		font-size: 1.5em;
		margin: 0;
		text-align: left;
		text-transform: uppercase;
		margin-bottom: 16px;
	}

	.branches {
		display: grid;
		overflow-y: auto;
		height: calc(100% - 29px - 16px);
		grid-auto-rows: min-content;
		row-gap: 8px;
		padding-right: 16px;
	}

	.branch {
		background: #fff;
		border: 1px dashed var(--color-gray);
		padding: 8px;
		font-size: 0.9em;
	}
</style>
