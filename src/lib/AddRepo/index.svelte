<script lang="ts">
	import { repos } from '$lib/stores';
	import { onMount } from 'svelte';

	let apiOpen;

	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleClick() {
		apiOpen({ directory: true })
			.then((dir: string) => {
				repos.update((prev) => {
					prev.push(dir);
					return [...new Set(prev)];
				});
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
