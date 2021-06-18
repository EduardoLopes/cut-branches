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
				<div
					class={`branch ${$currentRepo.currentBranch == branch ? 'current' : ''}`}
					title={`${$currentRepo.currentBranch == branch ? 'Current branch ' : ''}`}
				>
					{branch}
				</div>
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
		row-gap: 0;
		border: 1px dashed var(--color-gray);
	}

	.branch {
		background: rgba(255, 255, 255, 0.7);
		border-bottom: 1px dashed var(--color-gray);
		padding: 14px;
		font-size: 0.9em;
		cursor: pointer;
	}

	.branch.current {
		border-left: 4px solid var(--color-primary-1);
	}

	.branch:hover {
		background: rgba(255, 255, 255, 1);
	}
</style>
