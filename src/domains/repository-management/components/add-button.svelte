<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button, { type ButtonProps } from '@pindoba/svelte-button';
	import Loading from '@pindoba/svelte-loading';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { open } from '@tauri-apps/plugin-dialog';
	import { notifications } from '$domains/notifications/store/notifications.svelte';
	import { createCreateRepositoryMutation } from '$domains/repository-management/services/create-create-repository-mutation';
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

	const queryClient = useQueryClient();

	// Mutation to create repository
	const createRepositoryMutation = createCreateRepositoryMutation({
		onSuccess: (data) => {
			// Invalidate repositories query to refetch the list
			queryClient.invalidateQueries({ queryKey: ['listRepositories'] });

			if (data) {
				notifications.push({
					feedback: 'success',
					title: 'Repository added',
					message: `The repository ${data.name} was added successfully`
				});
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

<Loading isLoading={createRepositoryMutation.isPending}>
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
