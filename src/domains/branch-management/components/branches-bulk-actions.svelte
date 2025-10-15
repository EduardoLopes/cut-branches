<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import TextInput from '@pindoba/svelte-text-input';
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteSet } from 'svelte/reactivity';
	import BranchSelection from '$domains/branch-management/components/branch-selection.svelte';
	import DeleteBranchModal from '$domains/branch-management/components/delete-branch-modal.svelte';
	import {
		createSelectedBranchesQuery,
		createDeletedSelectedBranchesQuery
	} from '$domains/branch-management/services/createSelectedBranchesQuery';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import type { Repository } from '$services/common';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		currentRepo: Repository | undefined;
		onSearch: (value: string) => void;
		onClearSearch: () => void;
		actionsSnippet?: Snippet<[Repository, Set<string> | undefined | undefined]>;
		branchContext?: 'current' | 'deleted';
	}

	const {
		currentRepo,
		onSearch,
		onClearSearch,
		actionsSnippet,
		branchContext = 'current',
		...rest
	}: Props = $props();

	const search = $derived(getSearchBranchesStore(currentRepo?.name));

	const queryInput = $derived({ repoId: currentRepo?.id ?? '' });

	// Use queries for database-backed data
	const selectedQuery = $derived(
		branchContext === 'current'
			? createSelectedBranchesQuery(() => queryInput)
			: createDeletedSelectedBranchesQuery(() => queryInput)
	);

	const searchToggle = createToggle(false);
</script>

{#snippet defaultActionsSnippet(repo: Repository, selectedBranches?: Set<string> | undefined)}
	<div data-testid="delete-branch-modal">
		<DeleteBranchModal id={repo?.name} buttonProps={{ disabled: selectedBranches?.size === 0 }} />
	</div>
{/snippet}

<div
	class={css({
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 'md',
		zIndex: '10',
		flexShrink: '0',
		position: 'sticky',
		top: '0',
		translucent: 'md',
		_light: {
			borderBottom: '1px solid token(colors.neutral.400)'
		},
		_dark: {
			borderBottom: '1px solid token(colors.neutral.200)'
		}
	})}
	data-testid="bulk-actions-container"
	{...rest}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			height: '100%',
			gap: 'md'
		})}
		data-testid="bulk-actions-left"
	>
		<BranchSelection repository={currentRepo} />
	</div>

	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			gap: 'xs'
		})}
		data-testid="bulk-actions-right"
	>
		<Group>
			<TextInput
				class={css({
					width: '130px'
				})}
				heightSize="sm"
				oninput={(event) => {
					const target = event.target;

					if (target instanceof HTMLInputElement) {
						onSearch(target.value);
						search?.set(target.value);
						searchToggle.set(true);
					}
				}}
				autocorrect="off"
				placeholder="Search branches"
				value={search?.state}
				data-testid="search-input"
			/>
			<Button
				size="sm"
				onclick={onClearSearch}
				disabled={!search?.state}
				data-testid="clear-search-button"
			>
				<div
					class={css({
						display: 'flex',
						alignItems: 'center',
						gap: 'xs'
					})}
				>
					<Icon icon="mdi:clear" width="16px" height="16px" />
					<span class={visuallyHidden()}>Clear search</span>
				</div>
			</Button>
		</Group>

		{#if currentRepo}
			{#if actionsSnippet}
				{@render actionsSnippet(currentRepo, new SvelteSet(selectedQuery.data?.branches ?? []))}
			{:else}
				{@render defaultActionsSnippet(
					currentRepo,
					new SvelteSet(selectedQuery.data?.branches ?? [])
				)}
			{/if}
		{/if}
	</div>
</div>
