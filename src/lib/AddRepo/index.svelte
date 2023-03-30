<script lang="ts">
	import { currentRepo, repos } from '$lib/stores';
	import type { IRepo } from '$lib/stores';
	import { getRepoInfo, toast } from '$lib/utils';
	import { onMount } from 'svelte';
	import AddAlt20 from 'carbon-icons-svelte/lib/AddAlt.svelte';
	import AddAlt32 from 'carbon-icons-svelte/lib/AddAlt.svelte';
	import type { OpenDialogOptions } from '@tauri-apps/api/dialog';

	let apiOpen: (options?: OpenDialogOptions | undefined) => Promise<string | string[] | null>;
	export let isFirst: boolean = false;

	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleClick() {
		apiOpen({ directory: true })
			.then((dir) => {
				if (dir && typeof dir === 'string') {
					getRepoInfo(dir)
						.then((res) => {
							if (res) {
								$repos = [...$repos.filter((item) => item.path !== res.path), res];
								$currentRepo = res;
							}
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

<button class="add-repo" class:isFirst on:click={handleClick}>
	{#if !isFirst}
		<AddAlt20 />
	{/if}
	{#if isFirst}
		<AddAlt32 />
	{/if}
</button>

<style src="./styles.scss" lang="scss"></style>
