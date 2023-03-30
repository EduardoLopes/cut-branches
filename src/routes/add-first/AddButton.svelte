<script lang="ts">
	import { onMount } from 'svelte';
	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import Icon from '$lib/primitives/Icon/index.svelte';
	import MdAddCircleOutline from 'svelte-icons/md/MdAddCircleOutline.svelte';
	import type { OpenDialogOptions } from '@tauri-apps/api/dialog';
	import { getRepoInfo, toast } from '$lib/utils';

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

<Button on:click={handleAddClick}>
	Add a git repository
	<Icon size="2rem" color="#FFF">
		<MdAddCircleOutline />
	</Icon>
</Button>
