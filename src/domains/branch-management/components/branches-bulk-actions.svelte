<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import TextInput from '@pindoba/svelte-text-input';
	import { type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { SvelteSet } from 'svelte/reactivity';
	import DeleteBranchModal from '$domains/branch-management/components/delete-branch-modal.svelte';
	import { createLockedBranchesQuery } from '$domains/branch-management/services/createLockedBranchesQuery';
	import {
		createAddSelectedBranchesMutation,
		createClearSelectedBranchesMutation,
		createAddDeletedSelectedBranchesMutation,
		createClearDeletedSelectedBranchesMutation
	} from '$domains/branch-management/services/createSelectedBranchesMutations';
	import {
		createSelectedBranchesQuery,
		createDeletedSelectedBranchesQuery
	} from '$domains/branch-management/services/createSelectedBranchesQuery';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import type { Branch } from '$lib/bindings';
	import type { Repository } from '$services/common';
	import { isEmptyString, formatString } from '$utils/string-utils';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		currentRepo: Repository | undefined;
		selectibleCount: number;
		selectedSearchLength: number;
		branches: Branch[];
		onSearch: (value: string) => void;
		onClearSearch: () => void;
		actionsSnippet?: Snippet<[Repository, Set<string> | undefined | undefined]>;
		variant?: 'default' | 'restore';
		branchContext?: 'current' | 'deleted';
	}

	const {
		currentRepo,
		selectibleCount,
		selectedSearchLength,
		branches,
		onSearch,
		onClearSearch,
		actionsSnippet,
		variant = 'default',
		branchContext = 'current',
		...rest
	}: Props = $props();

	const search = $derived(getSearchBranchesStore(currentRepo?.name));

	const queryInput = $derived({ repoId: currentRepo?.id ?? '' });

	// Use queries for database-backed data
	const lockedQuery = $derived(createLockedBranchesQuery(queryInput));
	const selectedQuery = $derived(
		branchContext === 'current'
			? createSelectedBranchesQuery(queryInput)
			: createDeletedSelectedBranchesQuery(queryInput)
	);

	const searchToggle = createToggle(false);

	// Computed label based on variant
	const branchLabel = $derived.by(() => {
		const prefix = variant === 'restore' ? 'deleted ' : '';
		return {
			singular: `${prefix}branch`,
			plural: `${prefix}branches`
		};
	});

	// Mutations
	const addSelectedMutation = $derived(
		branchContext === 'current'
			? createAddSelectedBranchesMutation()
			: createAddDeletedSelectedBranchesMutation()
	);

	const clearSelectedMutation = $derived(
		branchContext === 'current'
			? createClearSelectedBranchesMutation()
			: createClearDeletedSelectedBranchesMutation()
	);

	// Computed state
	const lockedBranches = $derived(
		lockedQuery.data?.branches ? new Set(lockedQuery.data.branches) : new Set<string>()
	);

	async function handleSelectAll() {
		const indeterminate = selectedSearchLength !== selectibleCount && selectedSearchLength > 0;

		if (!currentRepo?.id) return;

		// If we have no selected branches or some (but not all) are selected, we need to select all
		if (indeterminate || selectedSearchLength === 0) {
			// Collect branches to select
			const branchesToAdd: string[] = [];

			for (let i = 0, len = branches.length; i < len; i++) {
				const branch = branches[i];
				if (branch.name !== currentRepo?.currentBranch && !lockedBranches.has(branch.name)) {
					branchesToAdd.push(branch.name);
				}
			}

			// Use mutateAsync to properly chain operations
			try {
				await clearSelectedMutation.mutateAsync({
					repoId: currentRepo.id
				});
				await addSelectedMutation.mutateAsync({
					repoId: currentRepo.id,
					branchNames: branchesToAdd
				});
			} catch (error) {
				// Error handling is done by the mutation's onError callback
				console.error('Failed to select all branches:', error);
			}
		} else {
			// If all are selected, we need to deselect all
			clearSelectedMutation.mutate({ repoId: currentRepo.id });
		}
	}
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
		{#if selectibleCount > 0}
			{#key selectibleCount}
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
						indeterminate={selectedSearchLength !== selectibleCount && selectedSearchLength > 0}
						onclick={handleSelectAll}
						checked={selectedSearchLength === selectibleCount}
						data-testid="select-all-checkbox"
					>
						<div class={visuallyHidden()}>Select all</div>
					</Checkbox>

					{#if search?.state?.length ?? 0 > 0}
						<div class={css({ fontSize: 'md' })} data-testid="search-query-info">
							<span class={css({ color: 'neutral.950.contrast' })}
								>{selectedQuery.data?.branches.length ?? 0}</span
							>
							{selectedQuery.data?.branches.length === 1
								? branchLabel.singular
								: branchLabel.plural}
							{selectedQuery.data?.branches.length === 1 ? 'is' : 'are'} selected /
							<span class={css({ color: 'neutral.950.contrast' })}>{selectibleCount}</span>
							{selectibleCount === 1 ? branchLabel.singular : branchLabel.plural}
							{selectibleCount === 1 ? 'was' : 'were'} found for
							<strong class={css({ color: 'primary.800' })}>
								{formatString('{query}', {
									query: search?.state ? search.state.trim() : ''
								})}
							</strong>
						</div>
					{/if}

					{#if isEmptyString(search?.state)}
						<div data-testid="selectible-count-info">
							{formatString('{selected} / {total} {label}', {
								selected: selectedQuery.data?.branches.length ?? 0,
								total: selectibleCount,
								label: selectibleCount === 1 ? branchLabel.singular : branchLabel.plural
							})}
						</div>
					{/if}
				</div>
			{/key}
		{/if}
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
