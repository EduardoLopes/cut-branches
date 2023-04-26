<script lang="ts">
	import { onMount } from 'svelte';
	import { repos } from '$lib/stores';
	import Button from '$lib/primitives/Button/index.svelte';
	import type { OpenDialogOptions } from '@tauri-apps/api/dialog';
	import { getRepoInfo } from '$lib/utils';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { toast } from './primitives/Toast.svelte';
	import { useGetRootPath } from './services/useGetRootPath';
	import { open } from '@tauri-apps/api/dialog';

	let lastPathSelected: string | undefined;

	$: getRootPath = useGetRootPath(lastPathSelected, {
		enabled: Boolean(lastPathSelected),
		onError: (errors) => {
			errors.reverse().forEach((item) => toast.danger({ message: item }));
		}
	});

	$: if ($getRootPath.data) {
		goto(`/repos/${$getRootPath.data.name}`, {
			state: {
				path: $getRootPath.data.path,
				name: $getRootPath.data.name
			}
		});
	}

	async function handleAddClick() {
		if (open) {
			open({ directory: true })
				.then(async (dir) => {
					if (dir && typeof dir === 'string') {
						lastPathSelected = dir;
					}
				})
				.catch((error) => {
					toast.danger({ message: error });
				});
		}
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
