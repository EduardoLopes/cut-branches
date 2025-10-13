<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import { createGetRepositoryQuery } from '../logic/application/queries/create-get-repository-query';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import RemoveRepositoryModal from '$domains/repository-management/components/remove-repository-modal.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		title?: string;
		repositoryId?: string;
		isLoading: boolean;
		isFetching: boolean;
		onUpdate: () => void;
		showBackButton?: boolean;
		showRestoreButton?: boolean;
		showUpdateButton?: boolean;
		showRemoveButton?: boolean;
	}

	const {
		repositoryId,
		isLoading,
		isFetching,
		onUpdate,
		title,
		showBackButton = true,
		showRestoreButton = true,
		showUpdateButton = true,
		showRemoveButton = true
	}: Props = $props();

	const getRepositoryListQuery = $derived(createGetRepositoryListQuery());

	const repositoryPath = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === repositoryId)?.path
	);

	const getRepositoryQuery = $derived(createGetRepositoryQuery(() => repositoryPath));

	function navigateToRestore() {
		if (repositoryId) {
			goto(resolve(`/repos/${repositoryId}/restore`));
		}
	}

	function navigateBack() {
		if (repositoryId) {
			goto(resolve(`/repos/${repositoryId}`));
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
		{#key getRepositoryQuery.data?.name}
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
				{:else if getRepositoryQuery.data?.name}
					<span
						class={css({
							textTransform: 'uppercase'
						})}
					>
						{getRepositoryQuery.data?.name}
					</span>
				{/if}
			</h2>
		{/key}
	</div>

	{#if showRestoreButton || showUpdateButton || showRemoveButton}
		<Loading {isLoading}>
			<Group direction="horizontal">
				{#if showRestoreButton && repositoryId}
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
					<Loading isLoading={isFetching}>
						<Button
							emphasis="ghost"
							size="sm"
							onclick={onUpdate}
							disabled={isFetching}
							shape="square"
							data-testid="update-button"
						>
							<Icon icon="material-symbols:refresh-rounded" width="24px" height="24px" />
							<span class={visuallyHidden()}>Update</span>
						</Button>
					</Loading>
				{/if}

				{#if getRepositoryQuery.data && showRemoveButton}
					<RemoveRepositoryModal currentRepo={getRepositoryQuery.data} />
				{/if}
			</Group>
		</Loading>
	{/if}
</div>
