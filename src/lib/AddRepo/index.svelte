<script lang="ts">
	import { repos } from '$lib/stores';
	import type { Repo } from '$lib/stores';
	import { getRepoInfo } from '$lib/utils';
	import { onMount } from 'svelte';
	import AddAlt20 from 'carbon-icons-svelte/lib/AddAlt20';
	import { toast } from '@zerodevx/svelte-toast';

	let apiOpen;

	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleClick() {
		apiOpen({ directory: true })
			.then((dir: string) => {
				if (dir) {
					getRepoInfo(dir)
						.then((res: Repo) => {
							$repos = [...$repos.filter((item) => item.path !== res.path), res];
						})
						.catch((errors: string[]) => {
							errors.reverse().forEach((item) => toast.push(item));
						});
				}
			})
			.catch((error) => {
				toast.push(error);
			});
	}
</script>

<button class="add-repo" on:click={handleClick}> <AddAlt20 /> </button>

<style src="./styles.scss" lang="scss"></style>
