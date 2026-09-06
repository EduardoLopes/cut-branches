<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import Input, { type InputProps } from '@pindoba/svelte-input';
	import Stamp from '@pindoba/svelte-stamp';
	import { getSearchBranchesStore } from '$domains/branch-management/core/composables/search-branches.svelte';
	import { createToggle } from '$lib/svelte-runes-utils';
	import type { Repository } from '$types/repository';
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

<!-- `alignSelf: center`: Group's base style pins itself with `alignSelf: start`,
     which beats the toolbar row's `alignItems: center` and hangs the field from
     the top of the row whenever a taller control (the Active/Deleted segmented
     control) sets the row's height. -->
<Group class={css({ alignSelf: 'center' })}>
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
		<Stamp emphasis="ghost" border="none" background="transparent">
			<Icon icon="mdi:clear" width="16px" height="16px" />
		</Stamp>
		<span class={visuallyHidden()}>Clear search</span>
	</Button>
</Group>
