<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import TextInput from '@pindoba/svelte-text-input';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import type { Repository } from '$services/common';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/panda/css';
	import { visuallyHidden } from '@pindoba/panda/patterns';

	interface Props extends Omit<HTMLInputAttributes, 'oninput'> {
		repository: Repository | undefined;
		oninput?: (value: string) => void;
		placeholder?: string;
		width?: string;
		branchContext?: 'active' | 'deleted';
		disabled?: boolean;
	}

	const {
		repository,
		oninput,
		placeholder = 'Search',
		width = '130px',
		branchContext = 'active',
		disabled = false,
		...rest
	}: Props = $props();

	const search = $derived(getSearchBranchesStore(`${repository?.id}-${branchContext}`));
	const searchToggle = createToggle(false);

	const handleInput = (event: Event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement) {
			search?.set(target.value);
			searchToggle.set(true);
			oninput?.(target.value);
		}
	};

	const handleClear = () => {
		search?.clear();
		searchToggle.reset();
	};
</script>

<Group>
	<TextInput
		class={css({
			width
		})}
		heightSize="sm"
		oninput={handleInput}
		autocorrect="off"
		{placeholder}
		{disabled}
		value={search?.state}
		{...rest}
	/>
	<Button
		size="sm"
		onclick={handleClear}
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
