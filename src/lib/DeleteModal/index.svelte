<script lang="ts">
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';

	export let show;
	export let path;
	export let repoName;
	export let onClose;
	export let onYes;
	export let onNo;
	export let branches: string[];

	function handleYes() {
		if (onYes) onYes();
		document.body.style.overflow = 'auto';
	}

	function handleNo() {
		if (onNo) onNo();
		document.body.style.overflow = 'auto';
	}

	onMount(() => (document.body.style.overflow = 'hidden'));
</script>

<div class={`container ${show ? 'show' : 'hide'}`}>
	<div class="wrapper">
		<div class="header">
			<div class="repoName">{repoName}</div>
			<button
				on:click={() => {
					if (onClose) onClose();
					document.body.style.overflow = 'auto';
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
		<div class="question">
			<p>Are you sure do you wanna delete these branches?</p>
			<div>
				<button class="yes" on:click={handleYes}>Yes</button>
				<button class="no" on:click={handleNo}>No</button>
			</div>
		</div>
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
		margin-bottom: 0;
		overflow: auto;
	}

	.branches div {
		padding: 10px;
		border: none;
		background: rgb(255, 142, 142);
		color: #fff;
	}

	.question {
		padding: 16px;
		text-align: center;
	}

	.question p {
		margin-top: 0;
	}

	.question button {
		border: none;
		padding: 8px 16px;
		cursor: pointer;
		color: #fff;
	}

	.question button.no {
		background: rgb(255, 142, 142);
	}

	.question button.yes {
		background: rgba(128, 161, 66, 1);
	}
</style>
