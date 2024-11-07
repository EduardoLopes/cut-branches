<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { open } from '@tauri-apps/plugin-dialog';
	import { css } from '@pindoba/panda/css';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { repositories } from '$lib/stores/repos.svelte';
	import { untrack } from 'svelte';

	let path = $state<string | undefined>('');
	const repoQuery = getRepoByPath(() => path);

	$effect(() => {
		if (repoQuery.data) {
			goto(`/repos/${repoQuery.data.id}`, {
				state: {
					path: repoQuery.data.path,
					name: repoQuery.data.name,
					id: repoQuery.data.id
				}
			});
		}
	});

	function handleAddClick() {
		if (open) {
			open({ directory: true })
				.then((dir) => {
					if (dir && typeof dir === 'string') {
						path = dir;
					}
				})
				.catch((error) => {
					notifications.push({ title: 'Error', message: error, feedback: 'danger' });
				});
		}
	}
</script>

<Button onclick={handleAddClick} size="lg" emphasis="secondary">
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			gap: 'sm'
		})}
	>
		Add a git repository
		<Icon
			icon="material-symbols:add-circle-outline-rounded"
			width="20px"
			height="20px"
			color="#fff"
		/>
	</div>
</Button>
