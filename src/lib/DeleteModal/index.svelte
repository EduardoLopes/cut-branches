<script lang="ts">
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';

	export let show;
	export let path;
	export let repoName;
	export let onClose;
	export let branches: string[];
</script>

<div class={`container ${show ? 'show' : 'hide'}`}>
	<div class="wrapper">
		<div class="header">
			<div class="repoName">{repoName}</div>
			<button
				on:click={() => {
					if (onClose) onClose();
				}}
				class="close">X</button
			>
		</div>
		{#if branches}
			<div class="branches">
				{#each branches as branch}
					<div>{branch}</div>
				{/each}
			</div>
		{/if}
		<div class="question" />
	</div>
</div>

<style>
	.container {
		position: fixed;
		background: #fff;
		top: 0;
		z-index: 20;
		left: 0;
		right: 0;
		bottom: 0;
		height: 100vh;
	}

	.wrapper {
		position: relative;
		display: grid;
		grid-template-rows: min-content auto min-content;
		height: 100%;
	}

	.header {
		padding: 16px;
		border-bottom: 1px solid #c0d892;
		background: #c0d892;
		top: 0;
		z-index: 10;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		min-height: min-content;
		display: flex;
	}

	.header button {
		border: 0;
	}

	.container.show {
		display: block;
	}

	.container.hide {
		display: none;
	}

	.branches {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin: 8px;
		padding-right: 8px;
		height: 100%;
		overflow: auto;
	}

	.branches div {
		padding: 10px;
		border: none;
		background: rgb(255, 142, 142);
		color: #fff;
	}

	.question {
		height: 200px;
		flex: 1;
	}
</style>
