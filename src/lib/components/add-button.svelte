<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import { open } from '@tauri-apps/plugin-dialog';
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { getRepoByPath } from '$lib/services/getRepoByPath';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';
	import { token } from '@pindoba/panda/tokens';

	interface Props extends ButtonProps {
		icon?: string;
		iconColor?: string;
		visualltHiddenLabel?: boolean;
	}

	const {
		size = 'lg',
		emphasis = 'secondary',
		icon = 'material-symbols:add-circle-outline-rounded',
		iconColor = token('colors.primary.950'),
		visualltHiddenLabel = false,
		...props
	}: Props = $props();

	let path = $state<string | undefined>('');
	const repoQuery = getRepoByPath(() => path);

	$effect(() => {
		if (repoQuery.data) {
			goto(`/repos/${repoQuery.data.id}`);
		}
		untrack(() => {
			// success
			if (repoQuery.isSuccess) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${repoQuery.data.name} was added successfully`
				});
			}
		});

		// error
		untrack(() => {
			if (repoQuery.isError) {
				notifications.push({
					feedback: 'danger',
					title: repoQuery.error.message,
					message: repoQuery.error.description
				});
			}
		});
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

<Button onclick={handleAddClick} {size} {emphasis} {...props}>
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			gap: 'sm'
		})}
	>
		{#if visualltHiddenLabel}
			<span class={visuallyHidden()}>Add a git repository</span>
		{/if}
		<Icon {icon} width="20px" height="20px" color={iconColor} />
	</div>
</Button>
