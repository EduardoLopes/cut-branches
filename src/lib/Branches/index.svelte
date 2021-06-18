<script lang="ts">
	import { currentRepo } from '$lib/stores';
	import { onMount } from 'svelte';

	let selected: string[] = [];

	onMount(async () => {});
</script>

<main class="container">
	<h1>{$currentRepo.name}</h1>

	<div class="branches">
		{#if $currentRepo.branches}
			{#each $currentRepo.branches as branch (branch)}
				<div
					class={`branch`}
					class:current={$currentRepo.currentBranch === branch}
					class:selected={selected.some((item) => item === branch)}
					title={`${$currentRepo.currentBranch === branch ? 'Current branch ' : ''}`}
					on:click={() => {
						if (selected.some((item) => item === branch)) {
							selected = selected.filter((item) => item !== branch);
							return;
						}

						selected.push(branch);
						selected = selected;
					}}
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
		cursor: default;
	}

	.branch.current:hover {
		background: rgba(255, 255, 255, 0.7);
		border-left: 4px solid var(--color-primary-1);
		cursor: default;
	}

	.branch.selected {
		background: var(--color-primary-2);
	}

	.branch.selected:hover {
		background: var(--color-primary-2);
		filter: contrast(1.2);
	}

	.branch:hover {
		background: rgba(255, 255, 255, 1);
	}
</style>
