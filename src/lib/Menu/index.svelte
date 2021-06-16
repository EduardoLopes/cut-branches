<script lang="ts">
	import { repos } from '$lib/stores';
	import { getRepoName } from '$lib/utils';
	import { onMount } from 'svelte';

	onMount(async () => {});
</script>

<div class="container">
	<div class="logo">Cut Branches</div>
	<div class="content">
		{#if $repos}
			<ul class="menu">
				{#each $repos as path (path)}
					<li>
						<button>{getRepoName(path)}<span class="count">21</span></button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
	<div class="add-more">
		<button> + </button>
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
		font-weight: bold;
		text-align: center;
		color: #fff;
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
		background: var(--color-gray);
		cursor: pointer;
	}

	.menu li button span {
		cursor: pointer;
		margin-left: 32px;
		background: var(--color-primary-2);
		padding: 4px;
		font-size: 0.8em;
	}

	.add-more button {
		width: 100%;
		height: 100%;
		padding: 8px;
		border: 0;
		background: var(--color-primary-2);
		color: var(--color-primary);
		font-size: 1.5em;
		cursor: pointer;
	}

	.add-more button:hover {
		background: var(--color-gray);
	}
</style>
