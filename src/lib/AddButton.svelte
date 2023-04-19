<script lang="ts">
	import { onMount } from 'svelte';
	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import type { OpenDialogOptions } from '@tauri-apps/api/dialog';
	import { getRepoInfo } from '$lib/utils';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { toast } from './primitives/Toast.svelte';

	let apiOpen: (options?: OpenDialogOptions | undefined) => Promise<string | string[] | null>;
	onMount(async () => {
		const { open } = await import('@tauri-apps/api/dialog');

		apiOpen = open;
	});

	function handleAddClick() {
		apiOpen({ directory: true })
			.then((dir) => {
				if (dir && typeof dir === 'string') {
					getRepoInfo(dir)
						.then((res) => {
							if (res) {
								$repos = [...$repos.filter((item) => item.path !== res.path), res];
								goto('/');
							}
						})
						.catch((errors: string[]) => {
							errors.reverse().forEach((item) => toast.danger({ message: item }));
						});
				}
			})
			.catch((error) => {
				toast.danger({ message: error });
			});
	}
</script>

<Button on:click={handleAddClick}>
	Add a git repository
	<Icon
		icon="material-symbols:add-circle-outline-rounded"
		width="20px"
		height="20px"
		color="#fff"
	/>
</Button>
