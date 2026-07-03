<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { open } from '@tauri-apps/plugin-dialog';
	import { createCreateRepositoryMutation } from '$domains/repository-management/infrastructure/mutations/create-create-repository-mutation';
	import type { CreateRepositoryOutput } from '$infrastructure/bindings';
	import { notifications } from '$services/notifications/notifications.svelte';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends ButtonProps {
		icon?: string;
		visuallyHiddenLabel?: boolean;
		onSuccess?: (data: CreateRepositoryOutput) => void;
	}

	const {
		size = 'lg',
		emphasis = 'primary',
		icon = 'material-symbols:add-circle-outline-rounded',
		visuallyHiddenLabel = false,
		onSuccess,
		...props
	}: Props = $props();

	const queryClient = useQueryClient();

	const createRepositoryMutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			queryClient.invalidateQueries({ queryKey: ['getRepositoryList'] });

			if (data) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${data.name} was added successfully`
				});
				onSuccess?.(data);
			}
		},
		meta: {
			showErrorNotification: true
		}
	});

	function handleAddClick() {
		open({ directory: true, multiple: false })
			.then((dir) => {
				if (dir !== null) {
					createRepositoryMutation.mutate({ path: dir });
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

<Loading loading={createRepositoryMutation.isPending}>
	{#if visuallyHiddenLabel}
		<Button onclick={handleAddClick} {size} {emphasis} {...props}>
			<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
			<span class={visuallyHidden()}>Add a git repository</span>
		</Button>
	{:else}
		<Button onclick={handleAddClick} {size} {emphasis} {...props}>
			Add a git repository
			{#snippet trailing()}
				<Icon {icon} width="20px" height="20px" data-testid="add-button-icon" />
			{/snippet}
		</Button>
	{/if}
</Loading>
