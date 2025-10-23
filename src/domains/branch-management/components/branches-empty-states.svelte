<script lang="ts">
	import EmptyState from '$ui/core/empty-state.svelte';
	import { css } from '@pindoba/panda/css';

	interface Props {
		emptyStateMessage: string;
		infoMessage?: string;
		searchNoResultsFound: boolean;
		searchTerm?: string;
		isLoading: boolean;
		branchesLength: number;
		repositoryId: string;
	}

	const {
		emptyStateMessage,
		infoMessage,
		searchNoResultsFound,
		searchTerm = '',
		isLoading,
		branchesLength,
		repositoryId
	}: Props = $props();
</script>

{#if infoMessage}
	<div
		class={css({
			display: 'flex',
			alignItems: 'center',
			padding: 'md',
			fontSize: 'md'
		})}
	>
		{infoMessage}
	</div>
{/if}

{#key `${repositoryId}-search-${searchTerm}`}
	{#if searchNoResultsFound}
		<EmptyState message={`No results for **${searchTerm}**!`} testId="no-results-message" />
	{/if}

	{#if branchesLength === 0 && !searchNoResultsFound && !isLoading}
		<EmptyState message={emptyStateMessage} icon="mdi:source-branch-remove" />
	{/if}
{/key}
