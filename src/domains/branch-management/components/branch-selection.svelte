<script lang="ts">
	import Checkbox from '@pindoba/svelte-checkbox';
	import { useBranchSelection } from '$domains/branch-management/logic/application/use-branch-selection.svelte';
	import type { Repository } from '$services/common';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		repository: Repository | undefined;
	}

	const { repository }: Props = $props();

	const selection = useBranchSelection({ repository: () => repository });

	// Local state to control checkbox - synced with selection state
	let isIndeterminate = $state(false);
	let isAllSelected = $state(false);

	// Sync local state with selection state
	$effect(() => {
		isIndeterminate = selection.isIndeterminate;
		isAllSelected = selection.isAllSelected;
	});
</script>

{#if selection.selectibleCount > 0}
	{#key selection.selectibleCount}
		<div
			class={css({
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				height: '100%',
				gap: 'sm'
			})}
			data-testid="select-all-container"
		>
			<Checkbox
				id="select-all"
				bind:indeterminate={isIndeterminate}
				onclick={selection.handleSelectAll}
				bind:checked={isAllSelected}
				data-testid="select-all-checkbox"
			>
				<div class={visuallyHidden()}>Select all</div>
			</Checkbox>

			{#if selection.hasSearchQuery}
				<div class={css({ fontSize: 'md' })} data-testid="search-query-info">
					<span class={css({ color: 'neutral.950.contrast' })}>
						{selection.selectedCount}
					</span>
					{selection.searchInfoText?.selectedLabel}
					{selection.searchInfoText?.selectedVerb} selected /
					<span class={css({ color: 'neutral.950.contrast' })}>
						{selection.selectibleCount}
					</span>
					{selection.searchInfoText?.selectibleLabel}
					{selection.searchInfoText?.selectibleVerb} found for
					<strong class={css({ color: 'primary.800' })}>
						"{selection.searchInfoText?.query}"
					</strong>
				</div>
			{:else}
				<div data-testid="selectible-count-info">
					{selection.countInfoText}
				</div>
			{/if}
		</div>
	{/key}
{/if}
