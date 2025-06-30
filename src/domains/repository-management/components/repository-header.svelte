<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import { goto } from '$app/navigation';
	import RemoveRepositoryModal from '$domains/repository-management/components/remove-repository-modal.svelte';
	import { getRepositoryStore } from '$domains/repository-management/store/repository.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		title?: string;
		repositoryId?: string;
		isLoading: boolean;
		onUpdate: () => void;
		showBackButton?: boolean;
		showRestoreButton?: boolean;
		showUpdateButton?: boolean;
		showRemoveButton?: boolean;
	}

	const {
		repositoryId,
		isLoading,
		onUpdate,
		title,
		showBackButton = true,
		showRestoreButton = true,
		showUpdateButton = true,
		showRemoveButton = true
	}: Props = $props();

	const repository = $derived(getRepositoryStore(repositoryId));

	function navigateToRestore() {
		if (repositoryId) {
			goto(`/repos/${repositoryId}/restore`);
		}
	}

	function navigateBack() {
		if (repositoryId) {
			goto(`/repos/${repositoryId}`);
		}
	}
</script>

<div
	class={css({
		display: 'flex',
		position: 'sticky',
		justifyContent: 'space-between',
		top: '0',
		alignItems: 'center',
		zIndex: '20',
		flexShrink: '0',
		px: 'md',
		height: 'calc((token(spacing.xl)) * 2.5)'
	})}
>
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			gap: 'sm'
		})}
	>
		{#key repository?.state?.name}
			<!-- back button -->
			{#if showBackButton}
				<Button
					emphasis="ghost"
					size="sm"
					onclick={navigateBack}
					shape="square"
					data-testid="restore-navigate-button"
				>
					<Icon icon="lucide:arrow-left" width="24px" height="24px" />
					<span class={visuallyHidden()}>Back</span>
				</Button>
			{/if}
			<h2
				class={css({
					textStyle: '4xl'
				})}
				data-testid="repository-name"
			>
				{#if title}
					{title}
				{:else if repository?.state?.name}
					<span
						class={css({
							textTransform: 'uppercase'
						})}
					>
						{repository.state.name}
					</span>
				{/if}
			</h2>
		{/key}
	</div>

	{#if showRestoreButton || showUpdateButton || showRemoveButton}
		<Loading {isLoading}>
			<Group direction="horizontal">
				{#if repository?.state && showRestoreButton}
					<Button
						emphasis="ghost"
						size="sm"
						onclick={navigateToRestore}
						data-testid="restore-navigate-button"
						class={css({
							gap: 'sm'
						})}
					>
						<Icon icon="lucide:undo" width="24px" height="24px" />
						<span>Restore</span>
					</Button>
				{/if}
				{#if showUpdateButton}
					<Button
						emphasis="ghost"
						size="sm"
						onclick={onUpdate}
						shape="square"
						data-testid="update-button"
					>
						<Icon icon="material-symbols:refresh-rounded" width="24px" height="24px" />
						<span class={visuallyHidden()}>Update</span>
					</Button>
				{/if}

				{#if repository?.state && showRemoveButton}
					<RemoveRepositoryModal currentRepo={repository?.state} />
				{/if}
			</Group>
		</Loading>
	{/if}
</div>
