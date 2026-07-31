<script lang="ts">
	import Card, { type CardProps, type PrimitiveCardHeaderProps } from '@pindoba/svelte-card';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Row label, rendered as the card heading. */
		heading: string;
		/** Optional help text below the heading. */
		subheading?: PrimitiveCardHeaderProps['subheading'];
		/** Optional leading icon (typically a Stamp snippet). */
		leading?: PrimitiveCardHeaderProps['leading'];
		/** Right-aligned interactive control (Input, Group, Checkbox, …). */
		control?: Snippet;
		/** Right-aligned read-only value, shown in mono when no `control` is given. */
		value?: string;
		/** Cross-axis alignment of the row (maps to the header's root layout). */
		align?: 'center' | 'start';
		/** Polymorphic root tag — e.g. `"label"` to make the whole row a control. */
		as?: CardProps['as'];
		interactive?: boolean;
		background?: CardProps['background'];
		feedback?: CardProps['feedback'];
		border?: CardProps['border'];
		/** Corner radius. Defaults to `"inner"` so a field nested in a
		 *  `SettingsSection` well stays concentric with it; pass a fixed tier when
		 *  the field renders standalone. */
		radius?: CardProps['radius'];
		class?: string;
		testId?: string;
	}

	const {
		heading,
		subheading,
		leading,
		control,
		value,
		align = 'center',
		as,
		interactive,
		background = 'surface.soft',
		feedback,
		border = 'default',
		radius = 'inner',
		class: className,
		testId
	}: Props = $props();

	const hasTrailing = $derived(!!control || value !== undefined);
</script>

{#snippet valueText()}
	<span class={css({ fontSize: 'sm', fontFamily: 'mono', color: 'neutral.text' })}>{value}</span>
{/snippet}

{#snippet trailing()}
	{#if control}
		{@render control()}
	{:else if value !== undefined}
		{@render valueText()}
	{/if}
{/snippet}

<Card
	size="sm"
	{as}
	{interactive}
	{background}
	{feedback}
	{border}
	{radius}
	class={className}
	data-testid={testId}
	header={{
		layout: { root: { align } },
		leading,
		heading,
		subheading,
		trailing: hasTrailing ? (trailing as PrimitiveCardHeaderProps['trailing']) : undefined
	}}
/>
