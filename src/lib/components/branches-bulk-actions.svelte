<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Group from '@pindoba/svelte-group';
	import TextInput from '@pindoba/svelte-text-input';
	import DeleteBranchModal from '$lib/components/delete-branch-modal.svelte';
	import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
	import type { Branch, Repository } from '$lib/stores/repositories.svelte';
	import { getSearchBranchesStore } from '$lib/stores/search-branches.svelte';
	import { getSelectedBranchesStore } from '$lib/stores/selected-branches.svelte';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props {
		currentRepo: Repository | undefined;
		selectibleCount: number;
		selectedLength: number;
		selectedSearchLength: number;
		branches: Branch[];
		onSearch: (value: string) => void;
		onClearSearch: () => void;
	}

	const {
		currentRepo,
		selectibleCount,
		selectedLength,
		selectedSearchLength,
		branches,
		onSearch,
		onClearSearch
	}: Props = $props();

	const search = $derived(getSearchBranchesStore(currentRepo?.name));
	const selected = $derived(getSelectedBranchesStore(currentRepo?.name));
	const locked = $derived(getLockedBranchesStore(currentRepo?.name));

	function handleSelectAll() {
		const indeterminate = selectedSearchLength !== selectibleCount && selectedSearchLength > 0;

		if (indeterminate || selectedSearchLength === 0) {
			const branchesToAdd = [];
			for (const item of branches) {
				if (item.name !== currentRepo?.currentBranch && !locked.has(item.name)) {
					branchesToAdd.push(item.name);
				}
			}
			selected.add(branchesToAdd);
		} else {
			const branchesToRemove = [];
			for (const item of branches) {
				if (item.name !== currentRepo?.currentBranch) {
					branchesToRemove.push(item.name);
				}
			}
			selected.remove(branchesToRemove);
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
		translucent: 'md'
	})}
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
			height: '100%',
			gap: 'md'
		})}
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
				>
					<Checkbox
						id="select-all"
						indeterminate={selectedSearchLength !== selectibleCount && selectedSearchLength > 0}
						onclick={handleSelectAll}
						checked={selectedSearchLength === selectibleCount}
					>
						<div class={visuallyHidden()}>Select all</div>
					</Checkbox>

					{#if search.query?.length ?? 0 > 0}
						<div class={css({ fontSize: 'md' })}>
							<span class={css({ color: 'neutral.950.contrast' })}>{selectedLength}</span>
							are selected /
							<span class={css({ color: 'neutral.950.contrast' })}>{selectibleCount}</span>
							{selectibleCount === 1 ? 'branch was' : 'branches were'} found for
							<strong class={css({ color: 'primary.800' })}>{search.query?.trim()}</strong>
						</div>
					{/if}

					{#if search.query?.length === 0 || typeof search.query === 'undefined'}
						{selectedLength} / {selectibleCount} branches
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
					search.set(target.value);
				}}
				autocorrect="off"
				placeholder="Search branches"
				value={search.query}
			/>
			<Button size="sm" onclick={onClearSearch} disabled={!search.query}>
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
			<div>
				<DeleteBranchModal {currentRepo} buttonProps={{ disabled: selectedLength === 0 }} />
			</div>
		{/if}
	</div>
</div>
