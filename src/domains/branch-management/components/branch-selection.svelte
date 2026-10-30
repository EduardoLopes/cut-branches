<script lang="ts">
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
</script>

{#if selection.selectibleCount > 0}
	{#key selection.selectibleCount}
		<!-- Select-all lives in the list's own header; the toolbar keeps the
		     count, which also says what the search narrowed it to. -->
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
