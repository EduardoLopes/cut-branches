<script lang="ts">
	import Icon from '@iconify/svelte';
	import Input from '@pindoba/svelte-input';
	import Stamp from '@pindoba/svelte-stamp';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** The query. Bindable. */
		value?: string;
		/** @default 'Filter' */
		placeholder?: string;
		/** Defaults to the placeholder. */
		ariaLabel?: string;
		/** How many items match the query; shown with `total` while a query is active. */
		matchCount?: number;
		/** How many items there are in total. */
		total?: number;
		/** `data-testid` of the input; the count gets `${testId}-count`. */
		testId?: string;
	}

	let {
		value = $bindable(''),
		placeholder = 'Filter',
		ariaLabel = placeholder,
		matchCount,
		total,
		testId = 'list-filter'
	}: Props = $props();

	// The count only means something against a query, and only when the caller
	// supplied both halves of it.
	const showCount = $derived(
		value.trim().length > 0 && matchCount !== undefined && total !== undefined
	);
	const countLabel = $derived(`${matchCount} of ${total}`);
	const countId = $derived(`${testId}-count`);
</script>

<!--
	The filter that heads every pick-list: full width so it reads as the list's
	own control rather than a stray field, with a live "n of N" so the effect of
	the query is visible without scanning the rows.
-->
<Input
	type="search"
	size="md"
	fullWidth
	autocorrect="off"
	{placeholder}
	aria-label={ariaLabel}
	bind:value
	data-testid={testId}
>
	{#snippet leading()}
		<Stamp emphasis="ghost" border="none" background="transparent">
			<Icon icon="lucide:search" width="16px" height="16px" />
		</Stamp>
	{/snippet}
	{#snippet trailing()}
		{#if showCount}
			<span
				class={css({
					fontSize: 'xs',
					color: 'neutral.text.muted',
					whiteSpace: 'nowrap',
					paddingX: '2xs'
				})}
				data-testid={countId}
			>
				{countLabel}
			</span>
		{/if}
	{/snippet}
</Input>
