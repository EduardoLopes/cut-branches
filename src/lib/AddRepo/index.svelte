<script lang="ts">
	import { currentRepo, repos } from '$lib/stores';
	import type { IRepo } from '$lib/stores';
	import { getRepoInfo, toast } from '$lib/utils';
	import { onMount } from 'svelte';
	import AddAlt20 from 'carbon-icons-svelte/lib/AddAlt20';

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
						.then((res: IRepo) => {
							$repos = [...$repos.filter((item) => item.path !== res.path), res];
							$currentRepo = res;
						})
						.catch((errors: string[]) => {
							errors.reverse().forEach((item) => toast.failure(item));
						});
				}
			})
			.catch((error) => {
				toast.failure(error);
			});
	}
</script>

<button class="add-repo" on:click={handleClick}> <AddAlt20 /> </button>

<style src="./styles.scss" lang="scss"></style>
