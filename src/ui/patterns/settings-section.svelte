<script lang="ts">
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Section title, rendered in the header Banner. */
		heading: string;
		/** Optional supporting text under the heading. */
		subheading?: BannerProps['subheading'];
		/** Leading icon for the header (typically a Stamp snippet). */
		leading?: BannerProps['leading'];
		/** Optional header action, flushed to the right (e.g. a reset button). */
		trailing?: BannerProps['trailing'];
		/** `data-testid` for the section root. */
		testId?: string;
		/** Section content — rows/cards rendered inside the recessed well. */
		children: Snippet;
	}

	const { heading, subheading, leading, trailing, testId, children }: Props = $props();
</script>

<div
	class={css({ display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0', gap: 'md' })}
	data-testid={testId}
>
	<Banner {leading} {heading} {subheading} {trailing} />

	<!-- Recessed well so the raised setting cards read with depth. -->
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			flex: '1',
			minHeight: '0',
			overflowY: 'auto',
			gap: 'sm',
			borderRadius: 'xl',
			borderWidth: '1px',
			borderStyle: 'solid',
			borderColor: 'neutral.border.muted',
			background: 'neutral.surface.deep',
			padding: 'md'
		})}
	>
		{@render children()}
	</div>
</div>
