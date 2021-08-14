<script lang="ts">
	import type { IBranch, IRepo } from '$lib/stores';
	import { deleteBranches, toast } from '$lib/utils';
	import Branch from '$lib/Branch/index.svelte';
	import { onMount } from 'svelte';

	export let show;
	export let path;
	export let repoName;
	export let onClose;
	export let onYes;
	export let onDone;
	export let onNo;
	export let branches: IBranch[];

	async function handleYes() {
		if (onYes) onYes();
		document.body.style.overflow = 'auto';

		deleteBranches(path, branches)
			.then((res) => {
				if (onDone) onDone();
			})
			.catch((errors: string[]) => {
				errors.reverse().forEach((item) => toast.failure(item));
			});
	}

	function handleNo() {
		if (onNo) onNo();
		document.body.style.overflow = 'auto';
	}

	onMount(() => {
		document.body.style.overflow = 'hidden';
	});
</script>

<div class="overlay" />
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
				{#each branches as branch (branch.name)}
					<Branch {branch} disabled={true} />
				{/each}
			</div>
		{/if}
		<div class="question">
			<p><strong>Are you sure do you wanna delete these branches?</strong></p>
			<div>
				<button class="yes" on:click={handleYes}>Yes</button>
				<button class="no" on:click={handleNo}>No</button>
			</div>
		</div>
	</div>
</div>

<style>
	.container {
		background: #e9e9e7;
		position: fixed;
		top: 16px;
		z-index: 20;
		left: 16px;
		right: 16px;
		bottom: 32px;
		height: calc(100vh - 32px);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}

	.overlay {
		top: 0;
		z-index: 10;
		left: 0;
		right: 0;
		bottom: 0;
		position: absolute;
		background: rgba(255, 255, 255, 0.5);
	}

	.wrapper {
		position: relative;
		display: grid;
		grid-template-rows: min-content auto min-content;
		height: 100%;
	}

	.header {
		border-bottom: 1px solid #c0d892;
		background: #c0d892;
		top: 0;
		z-index: 10;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		min-height: min-content;
		display: flex;
		background: var(--color-primary-1);
		color: #fff;
		text-transform: uppercase;
		font-size: 1.2em;
	}

	.header .repoName {
		padding: 16px;
	}

	.header button {
		border: 0;
		padding: 16px 24px;
		color: #fff;
		cursor: pointer;
		background: var(--color-primary-1);
		filter: contrast(1.2);
	}

	.header button:hover {
		filter: contrast(1.3);
	}

	.container.show {
		display: block;
	}

	.container.hide {
		display: none;
	}

	.branches {
		margin: 8px;
		margin-bottom: 16;
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
		border-top: 1px dashed var(--color-gray-1);
		background: rgba(255, 255, 255, 0.5);
	}

	.question p {
		margin-top: 0;
	}

	.question button {
		border: none;
		padding: 8px 32px;
		cursor: pointer;
		color: #fff;
		font-size: 1.1rem;
		font-weight: bold;
	}

	.question button:hover {
		filter: contrast(1.2);
	}

	.question button:active {
		filter: contrast(1.1);
	}

	.question button.no {
		background: var(--color-gray-1);
	}

	.question button.yes {
		background: #f34642;
	}

	.question button.yes:hover {
		filter: brightness(1.4);
	}

	.question button.yes:active {
		filter: contrast(1.3);
	}
</style>
