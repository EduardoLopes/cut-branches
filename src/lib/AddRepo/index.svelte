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

<button class="add-repo" on:click={handleClick}> Add Repository </button>

<style>
	.add-repo {
		background: rgba(128, 161, 66, 0.4);
		border: 1px solid #80a142;
		padding: 16px 32px;
		color: #000;
		cursor: pointer;
	}

	.add-repo:hover {
		background: rgba(128, 161, 66, 0.6);
		border: 1px solid #80a142;
		padding: 16px 32px;
		color: #000;
	}
</style>
