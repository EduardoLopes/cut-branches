<script lang="ts">
	import type { BannerProps } from '@pindoba/svelte-banner';
	import type { Snippet } from 'svelte';
	import PageHeader from './page-header.svelte';
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
		/** Section content — one or more `SettingsGroup`s. */
		children: Snippet;
	}

	const { heading, subheading, leading, trailing, testId, children }: Props = $props();
</script>

<!--
	A settings page: the standard page header over a scrolling column that sits
	directly on the page surface — no recessed well, like Linear's and ClickUp's
	settings. Without a well there is no outer radius for cards to nest inside,
	so their corners don't have to step down to an `inner` radius.

	The column is centred and width-capped, and it is the `settings` query
	container that each `SettingsGroup` collapses against. The rule above the
	first group is dropped so the stack starts flush.
-->
<PageHeader {leading} {heading} {subheading} {trailing} {testId} />

<div
	class={css({ flex: '1', minHeight: '0', overflowY: 'auto', overflowX: 'hidden', px: 'md' })}
	data-testid="settings-scroll"
>
	<div
		class={css({
			display: 'flex',
			flexDirection: 'column',
			gap: 'xl',
			width: '100%',
			maxWidth: '960px',
			marginInline: 'auto',
			paddingBlock: 'md',
			paddingBottom: '3xl',
			containerType: 'inline-size',
			containerName: 'settings',
			'& > section:first-of-type > [data-settings-group-separator]': { display: 'none' }
		})}
	>
		{@render children()}
	</div>
</div>
