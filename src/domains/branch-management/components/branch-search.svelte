<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Input, { type InputProps } from '@pindoba/svelte-input';
	import { getSearchBranchesStore } from '$domains/branch-management/core/composables/search-branches.svelte';
	import type { Repository } from '$types/repository';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends InputProps {
		repository: Repository | undefined;
		width?: string;
		branchContext?: 'active' | 'deleted';
	}

	const {
		repository,
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
		}
	};

	const handleClear = () => {
		search?.clear();
		searchToggle.reset();
	};
</script>

<Group>
	<Input
		class={css({
			width
		})}
		size="sm"
		oninput={handleInput}
		autocorrect="off"
		{placeholder}
		{disabled}
		value={search?.state}
		{...rest}
	/>
	<Button
		size="sm"
		shape="square"
		onclick={handleClear}
		disabled={!search?.state}
		data-testid="clear-search-button"
	>
		<Icon icon="mdi:clear" width="16px" height="16px" />
		<span class={visuallyHidden()}>Clear search</span>
	</Button>
</Group>
