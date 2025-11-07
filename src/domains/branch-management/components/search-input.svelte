<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Group from '@pindoba/svelte-group';
	import TextInput, { type TextInputProps } from '@pindoba/svelte-text-input';
	import { getSearchBranchesStore } from '$domains/branch-management/store/search-branches.svelte';
	import type { Repository } from '$services/common';
	import { createToggle } from '$utils/svelte-runes-utils';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props extends TextInputProps {
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
	>
		{#snippet fieldSuffix()}
			<Button
				size="sm"
				shape="square"
				onclick={handleClear}
				disabled={!search?.state}
				passThrough={{
					root: {
						style: css.raw({
							borderLeftRadius: '0'
						})
					}
				}}
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
		{/snippet}
	</TextInput>
</Group>
