<script lang="ts">
	import { repos } from '$lib/stores';
	import type { Repo } from '$lib/stores';
	import { getRepoInfo } from '$lib/utils';
	import { onMount } from 'svelte';
	import AddAlt20 from 'carbon-icons-svelte/lib/AddAlt20';

	let apiOpen;

	let _invoke;

	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleClick() {
		apiOpen({ directory: true })
			.then((dir: string) => {
				if (dir) {
					getRepoInfo(dir).then((res: Repo) => {
						$repos = [...$repos.filter((item) => item.path !== res.path), res];
					});
				}
			})
			.catch((error) => {
				console.log(error);
			});
	}
</script>

<button class="add-repo" on:click={handleClick}> <AddAlt20 /> </button>

<style>
	.add-repo {
		width: 100%;
		height: 100%;
		padding: 8px;
		border: 0;
		background: var(--color-primary-2);
		color: var(--color-primary);
		font-size: 1.5em;
		cursor: pointer;
	}

	.add-repo:hover {
		filter: contrast(1.3);
		background: var(--color-primary-2);
	}
</style>
