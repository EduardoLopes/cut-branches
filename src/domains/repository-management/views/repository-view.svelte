<script lang="ts">
	import type { Snippet } from 'svelte';
	import { createGetRepositoryListQuery } from '$domains/onboarding/logic/application/queries/create-get-repository-list-query';
	import RepositoryHeader from '$domains/repository-management/components/repository-header.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		id: string;
		defaultTitle?: string;
		isLoading?: boolean;
		leftActions?: Snippet;
		title?: Snippet;
		rightActions?: Snippet;
		children?: Snippet;
	}

	const {
		id,
		defaultTitle,
		isLoading = false,
		leftActions,
		title,
		rightActions,
		children
	}: Props = $props();

	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repository) => repository.id === id)
	);

	const repoInfo = $derived.by(() => {
		if (repository) {
			return {
				id: id,
				name: repository.name,
				currentBranch: repository.currentBranch
			};
		}
		return undefined;
	});
</script>

<div
	class={css({
		overflow: 'hidden',
		position: 'relative',
		height: 'calc(100vh - 30px)',
		pl: 0
	})}
>
	<main
		class={css({
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			position: 'relative',
			height: '100%',
			_light: {
				background: 'neutral.50'
			},
			_dark: {
				background: 'neutral.100'
			}
		})}
	>
		<!-- TOP BAR -->
		{#if repoInfo}
			<RepositoryHeader
				repositoryId={repoInfo.id}
				{defaultTitle}
				{isLoading}
				{leftActions}
				{title}
				{rightActions}
			/>
		{/if}
		<!-- TOP BAR END -->

		<!-- CONTENT -->
		{#if children}
			{@render children()}
		{/if}
		<!-- CONTENT END -->
	</main>
</div>
