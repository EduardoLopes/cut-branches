<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { open } from '@tauri-apps/plugin-dialog';
	import { untrack } from 'svelte';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createGetRepositoryQuery } from '$domains/repository-management/services/create-get-repository-query';
	import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import { RepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends ButtonProps {
		icon?: string;
		visuallyHiddenLabel?: boolean;
	}

	const {
		size = 'lg',
		emphasis = 'primary',
		icon = 'material-symbols:add-circle-outline-rounded',
		visuallyHiddenLabel = false,
		...props
	}: Props = $props();

	let path = $state<string | undefined>(undefined);
	const repoQuery = createGetRepositoryQuery(() => path, {
		meta: {
			showErrorNotification: true
		}
	});

	$effect(() => {
		if (repoQuery.isSuccess && repoQuery.data) {
			untrack(() => {
				const repository = getRepositoryStore(repoQuery.data.name);

				if (!RepositoryStore.repositories.has(repoQuery.data.name)) {
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
			untrack(() => {
				notifications.push({
					feedback: 'danger',
					title: repoQuery.error.message,
					message: repoQuery.error.description ?? undefined
				});
			});
		}
	});

	function handleAddClick() {
		open({ directory: true, multiple: false })
			.then((dir) => {
				if (dir !== null) {
					path = dir;
				}
			})
			.catch((error) => {
				notifications.push({
					title: 'Error',
					message: error.message || String(error),
					feedback: 'danger'
				});
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

			<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
		</div>
	</Button>
</Loading>
