<script lang="ts">
	import type { BannerProps } from '@pindoba/svelte-banner';
	import type { Snippet } from 'svelte';
	import PageHeader from './page-header.svelte';
	import PageWell from './page-well.svelte';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		/** Section title, rendered in the page header. */
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

<!--
	A settings section is just the standard page contract (header + recessed
	well) under a settings-flavoured name, so `/settings/*` and every other page
	share one implementation.
-->
<PageHeader {leading} {heading} {subheading} {trailing} {testId} />

<PageWell>
	<!-- Settings rows are discrete cards, so they need rhythm between them. The
	     well itself stays gapless — list-style pages (branches, worktrees) set
	     their own spacing on the list container. -->
	<div class={css({ display: 'flex', flexDirection: 'column', gap: 'sm' })}>
		{@render children()}
	</div>
</PageWell>
