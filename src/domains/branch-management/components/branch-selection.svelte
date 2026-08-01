<script lang="ts">
	import Checkbox from '@pindoba/svelte-checkbox';
	import { useBranchSelection } from '$domains/branch-management/core/composables/use-branch-selection.svelte';
	import { pluralize } from '$domains/branch-management/utils/format-branch-selection-text';
	import type { Repository } from '$types/repository';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		repository: Repository | undefined;
		branchContext: 'active' | 'deleted';
	}

	const { repository, branchContext }: Props = $props();

	const selection = useBranchSelection({
		repository: () => repository,
		branchContext: () => branchContext
	});

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
		<!-- The count sits beside the control, not inside its label slot: it
		     describes the list, not the checkbox. The slot is left empty (the
		     control is named by `aria-label`) so the row carries a single small
		     gap instead of the control's internal label gap plus its own. -->
		<div
			class={css({
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				height: '100%',
				gap: '2xs'
			})}
			data-testid="select-all-container"
		>
			<Checkbox
				id="select-all"
				size="lg"
				aria-label="Select all"
				bind:indeterminate={isIndeterminate}
				onclick={selection.handleSelectAll}
				bind:checked={isAllSelected}
				data-testid="select-all-checkbox"
			/>

			{#if selection.hasSearchQuery}
				<div
					class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
					data-testid="search-query-info"
				>
					<span class={css({ color: 'neutral.text.bold' })}>
						{selection.selectedCount}
					</span>
					{selection.searchInfoText?.selectedLabel}
					{selection.searchInfoText?.selectedVerb} selected /
					<span class={css({ color: 'neutral.text.bold' })}>
						{selection.selectibleCount}
					</span>
					{selection.searchInfoText?.selectibleLabel}
					{selection.searchInfoText?.selectibleVerb} found for
					<strong class={css({ color: 'primary.800' })}>
						"{selection.searchInfoText?.query}"
					</strong>
				</div>
			{:else}
				<div
					class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}
					data-testid="selectible-count-info"
				>
					<span class={css({ color: 'neutral.text.bold' })}>{selection.selectedCount}</span>
					/
					<span class={css({ color: 'neutral.text.bold' })}>{selection.selectibleCount}</span>
					{pluralize(selection.selectibleCount, 'branch', 'branches')}
				</div>
			{/if}
		</div>
	{/key}
{:else}
	<!-- Keeps the toolbar's left cell occupied so the bar can't change height
	     between states, and says why the control is missing. Mirrors the
	     worktrees page, which has always had this fallback. -->
	<span class={css({ fontSize: 'sm', color: 'neutral.text.muted' })}> No branches to select </span>
{/if}
