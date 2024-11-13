<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { open } from '@tauri-apps/plugin-dialog';
	import { untrack } from 'svelte';
	import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
	import { notifications } from '$lib/stores/notifications.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends ButtonProps {
		icon?: string;
		visuallyHiddenLabel?: boolean;
	}

	const {
		size = 'lg',
		emphasis = 'secondary',
		icon = 'material-symbols:add-circle-outline-rounded',
		visuallyHiddenLabel = false,
		...props
	}: Props = $props();

	let path = $state<string | undefined>(undefined);
	const repoQuery = createGetRepositoryByPathQuery(() => path);

	$effect(() => {
		if (repoQuery.isSuccess) {
			untrack(() => {
				path = undefined;
				const repository = getRepositoryStore(repoQuery.data.name);

				if (!repository?.state?.name) {
					repository?.set(repoQuery.data);
					// success
					notifications.push({
						feedback: 'success',
						title: 'Repository added',
						message: `The repository ${repoQuery.data.name} was added successfully`
					});

					return;
				}

				notifications.push({
					feedback: 'warning',
					title: 'Repository already exists',
					message: `The repository ${repoQuery.data.name} already exists`
				});
			});
		}

		if (repoQuery.isError) {
			// error
			untrack(() => {
				notifications.push({
					feedback: 'danger',
					title: repoQuery.error.message,
					message: repoQuery.error.description
				});
			});
		}
	});

	function handleAddClick() {
		open({ directory: true })
			.then((dir) => {
				if (dir !== null) {
					path = dir;
				}
			})
			.catch((error) => {
				notifications.push({ title: 'Error', message: error, feedback: 'danger' });
			});
	}
</script>

<Loading isLoading={repoQuery.isLoading}>
	<Button onclick={handleAddClick} {size} {emphasis} {...props}>
		<div
			class={css({
				display: 'flex',
				alignItems: 'center',
				gap: 'sm'
			})}
		>
			{#if visuallyHiddenLabel}
				<span class={visuallyHidden()}>Add a git repository</span>
			{:else}
				<span>Add a git repository</span>
			{/if}

			<Icon
				{icon}
				width="20px"
				height="20px"
				class={css({
					color: 'primary.800.contrast'
				})}
				data-testid="add-button-icon"
			/>
		</div>
	</Button>
</Loading>
