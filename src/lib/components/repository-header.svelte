<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import RemoveRepositoryModal from '$lib/components/remove-repository-modal.svelte';
	import { getRepositoryStore } from '$lib/stores/repository.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		repositoryId?: string;
		isLoading: boolean;
		onUpdate: () => void;
	}

	const { repositoryId, isLoading, onUpdate }: Props = $props();

	const repository = $derived(getRepositoryStore(repositoryId));
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
	{#key repository?.state?.name}
		<h2
			class={css({
				textStyle: '4xl',
				textTransform: 'uppercase'
			})}
			data-testid="repository-name"
		>
			{#if repository?.state?.name}
				{repository.state.name}
			{/if}
		</h2>
	{/key}

	<Loading {isLoading}>
		<Group direction="horizontal">
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

			{#if repository?.state}
				<RemoveRepositoryModal currentRepo={repository?.state} />
			{/if}
		</Group>
	</Loading>
</div>
