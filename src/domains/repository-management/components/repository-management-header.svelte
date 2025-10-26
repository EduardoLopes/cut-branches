<script lang="ts">
	import Group from '@pindoba/svelte-group';
	import { createGetRepositoryQuery } from '../core/composables/queries/create-get-repository-query';
	import RemoveRepositoryModal from './remove-repository-modal.svelte';
	import RestoreRepositoryButton from './restore-repository-button.svelte';
	import UpdateRepositoryButton from './update-repository-button.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		repositoryId: string;
	}

	const { repositoryId }: Props = $props();

	const getRepositoryQuery = createGetRepositoryQuery(() => ({ id: repositoryId }));
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
			<h2
				class={css({
					textStyle: '4xl'
				})}
				data-testid="repository-name"
			>
				{#if getRepositoryQuery.data?.name}
					<span
						class={css({
							textTransform: 'uppercase'
						})}
					>
						{getRepositoryQuery.data.name}
					</span>
				{/if}
			</h2>
		{/key}
	</div>

	<Group direction="horizontal">
		<RestoreRepositoryButton {repositoryId} />
		<UpdateRepositoryButton {repositoryId} />
		<RemoveRepositoryModal {repositoryId} />
	</Group>
</div>
