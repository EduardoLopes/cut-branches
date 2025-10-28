<script lang="ts">
	import { css } from '@pindoba/styled-system/css';
	import { createGetRepositoryQuery } from '../core/composables/queries/create-get-repository-query';
	import BackButton from './back-button.svelte';

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
			<BackButton {repositoryId} />

			<h2
				class={css({
					textStyle: '4xl'
				})}
				data-testid="restoration-title"
			>
				{#if getRepositoryQuery.data?.name}
					Restore branches from {getRepositoryQuery.data.name}
				{/if}
			</h2>
		{/key}
	</div>
</div>
