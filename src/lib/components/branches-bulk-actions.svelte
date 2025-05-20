<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import TextInput from '@pindoba/svelte-text-input';
	import type { HTMLAttributes } from 'svelte/elements';
	import DeleteBranchModal from '$lib/components/delete-branch-modal.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import type { Branch, Repository } from '$lib/stores/repository.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { isEmptyString, formatString } from '$lib/utils/string-utils';
	import { createToggle } from '$lib/utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		currentRepo: Repository | undefined;
		selectibleCount: number;
		selectedSearchLength: number;
		branches: Branch[];
		onSearch: (value: string) => void;
		onClearSearch: () => void;
	}

	const {
		currentRepo,
		selectibleCount,
		selectedSearchLength,
		branches,
		onSearch,
		onClearSearch,
		...rest
	}: Props = $props();

	const search = $derived(getSearchBranchesStore(currentRepo?.name));
	const selected = $derived(getSelectedBranchesStore(currentRepo?.name));
	const locked = $derived(getLockedBranchesStore(currentRepo?.name));
	const searchToggle = createToggle(false);

	function handleSelectAll() {
		const indeterminate = selectedSearchLength !== selectibleCount && selectedSearchLength > 0;

		// If we have no selected branches or some (but not all) are selected, we need to select all
		if (indeterminate || selectedSearchLength === 0) {
			// For better performance, create a tempSet to batch operations
			const tempSet = new Set<string>();

			// First, add all existing selections to maintain them
			if (selected?.state) {
				// Use for...of instead of forEach for better performance
				for (const branch of selected.state) {
					tempSet.add(branch);
				}
			}

			// Then add all branches that should be selected
			for (let i = 0, len = branches.length; i < len; i++) {
				const branch = branches[i];
				if (branch.name !== currentRepo?.currentBranch && !locked?.has(branch.name)) {
					tempSet.add(branch.name);
				}
			}

			// Clear current selections and add the complete set at once
			selected?.clear();
			selected?.add([...tempSet]);
		} else {
			// If all are selected, we need to deselect all
			selected?.clear();
		}
	}
</script>

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
							<span class={css({ color: 'neutral.950.contrast' })}>{selected?.state.size}</span>
							{selected?.state.size === 1 ? 'is' : 'are'} selected /
							<span class={css({ color: 'neutral.950.contrast' })}>{selectibleCount}</span>
							{selectibleCount === 1 ? 'branch was' : 'branches were'} found for
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
								selected: selected?.state.size ?? 0,
								total: selectibleCount,
								label: selectibleCount === 1 ? 'branch' : 'branches'
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
					const target = event.target as HTMLInputElement;
					onSearch(target.value);
					search?.set(target.value);
					searchToggle.set(true);
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

		{#if selectibleCount > 0 && currentRepo}
			<div data-testid="delete-branch-modal">
				<DeleteBranchModal
					id={currentRepo?.name}
					buttonProps={{ disabled: selected?.state.size === 0 }}
				/>
			</div>
		{/if}
	</div>
</div>
