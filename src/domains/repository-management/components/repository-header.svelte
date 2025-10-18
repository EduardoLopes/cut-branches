<script lang="ts">
	import Group from '@pindoba/svelte-group';
	import Loading from '@pindoba/svelte-loading';
	import type { Snippet } from 'svelte';
	import { createGetRepositoryQuery } from '../logic/application/queries/create-get-repository-query';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import { css } from '@pindoba/panda/css';

	interface Props {
		repositoryId?: string;
		defaultTitle?: string;
		isLoading?: boolean;
		leftActions?: Snippet;
		title?: Snippet;
		rightActions?: Snippet;
	}

	const {
		repositoryId,
		defaultTitle,
		isLoading = false,
		leftActions,
		title,
		rightActions
	}: Props = $props();

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repositoryPath = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === repositoryId)?.path
	);

	const getRepositoryQuery = createGetRepositoryQuery(() => repositoryPath);

	const repositoryName = $derived(getRepositoryQuery.data?.name);
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
		{#key repositoryName}
			<!-- left actions (e.g., back button) -->
			{#if leftActions}
				{@render leftActions()}
			{/if}

			<!-- title -->
			{#if title}
				{@render title()}
			{:else}
				<h2
					class={css({
						textStyle: '4xl'
					})}
					data-testid="repository-name"
				>
					{#if defaultTitle}
						{defaultTitle}
					{:else if repositoryName}
						<span
							class={css({
								textTransform: 'uppercase'
							})}
						>
							{repositoryName}
						</span>
					{/if}
				</h2>
			{/if}
		{/key}
	</div>

	<!-- right actions (e.g., restore, update, remove buttons) -->
	{#if rightActions}
		<Loading {isLoading}>
			<Group direction="horizontal">
				{@render rightActions()}
			</Group>
		</Loading>
	{/if}
</div>
