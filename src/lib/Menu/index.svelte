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
	<div class="add-more">add more</div>
</div>

<style>
	.container {
		display: grid;
		grid-template-rows: min-content auto min-content;
		background: #c7cd3e;
		height: 100vh;
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
		padding: 8px;
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
		border-radius: 8px;
	}

	.menu li button:hover {
		background: #e9e9e7;
		cursor: pointer;
	}

	.menu li button span {
		cursor: pointer;
		margin-left: 32px;
	}
</style>
