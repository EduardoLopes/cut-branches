<script lang="ts">
	import type { RepoID } from '$lib/stores';
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Button from '$lib/primitives/Button/index.svelte';
	import Icon from '@iconify/svelte';

	let id = $page.params.id;

	let currentRepo: RepoID | undefined;

	onMount(() => {
		currentRepo = $repos.filter((item) => item.id === id)[0];
	});

	function handleYes() {
		$repos = $repos.filter((item) => {
			return item.id !== currentRepo?.id;
		});

		goto(`/`);
	}

	function handleNo() {
		goto(`/repos/${id}`);
	}
</script>

<div class="container">
	<div class="header">
		<h1>{currentRepo?.name}</h1>
	</div>
	<div class="content">
		<div class="question">
			<p><strong>Are you sure do you wanna remove this repository from the app?</strong></p>
			<div class="buttons">
				<Button variant="secondary" on:click={handleNo}>Cancel</Button>
				<Button feedback="danger" on:click={handleYes}>
					<Icon icon="ion:trash-outline" width="20px" height="20px" color="#fff" /> Remove repository
				</Button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	.container {
		background: #e9e9e7;
		height: 100%;
		background: rgba(255, 255, 255, 0.5);
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.header {
		display: flex;
		justify-content: space-between;
		background: var(--color-danger-8);
		top: 0;
		box-shadow: 0px 2px 2px 0px rgb(0 0 0 / 8%);
		color: #fff;

		h1 {
			font-size: 1.3em;
			margin: 0;
			text-align: left;
			text-transform: uppercase;
			font-weight: bold;
			padding: 1.6rem;
		}
	}

	.question {
		padding: 16px;
		text-align: center;
		border-top: 1px dashed var(--color-gray-1);

		.buttons {
			display: flex;
			gap: 1.6rem;
			justify-content: center;

			:global {
				button {
					min-width: 10.6rem;
					justify-content: center;
					text-align: center;
					font-weight: bold;
				}
			}
		}

		p {
			margin-top: 0;
		}
	}
</style>
