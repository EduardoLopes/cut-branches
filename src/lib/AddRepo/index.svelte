<script lang="ts">
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';

	let apiOpen;

	let _invoke;

	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');
		// const { invoke } = await import('@tauri-apps/api/tauri');
		// _invoke = invoke;

		apiOpen = open;
	});

	function handleClick() {
		// _invoke('git_repo_dir', { path: 'a' });
		// console.log('git_repo_dir');
		apiOpen({ directory: true })
			.then((dir: string) => {
				if (dir) {
					// repos.update((prev) => {
					// 	prev.push(dir);
					// 	return [...new Set(prev)];
					// });

					$repos = [...new Set($repos), dir];
				}
			})
			.catch((error) => {
				console.log(error);
			});
	}
</script>

<button class="add-repo" on:click={handleClick}> + </button>

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
		background: var(--color-gray);
	}
</style>
