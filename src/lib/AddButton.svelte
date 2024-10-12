<script lang="ts">
	import Button from '@pindoba/svelte-button';
	import { goto } from '$app/navigation';
	import Icon from '@iconify/svelte';
	import { useCreateRepositoryID } from './services/useCreateRepositoryID';
	import { open } from '@tauri-apps/api/dialog';
	import { css } from '@pindoba/panda/css';
	import { createNotifications } from './stores/notifications';

	const notifications = createNotifications();

	let createRepositoryIDMutation = useCreateRepositoryID({
		onSuccess(data, variables, context) {
			goto(`/repos/${data.id}`, {
				state: {
					path: data.path,
					name: data.name,
					id: data.id
				}
			});
		},
		meta: {
			showErrorNotification: true
		}
	});

	async function handleAddClick() {
		if (open) {
			open({ directory: true })
				.then(async (dir) => {
					if (dir && typeof dir === 'string') {
						createRepositoryIDMutation.mutate({
							path: dir
						});
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
