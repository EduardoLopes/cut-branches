<script lang="ts">
	import Banner, { type BannerProps } from '@pindoba/svelte-banner';
	import Breadcrumb, { type BreadcrumbItemData } from '@pindoba/svelte-breadcrumb';
	import type { Snippet } from 'svelte';
	import { css } from '@pindoba/styled-system/css';

	export interface PageBreadcrumbItem {
		label: string;
		/** Omit on the last (current) crumb so it renders as plain text. */
		href?: string;
	}

	interface Props {
		/** Page title. A snippet when the title needs its own markup (badges, casing). */
		heading: BannerProps['heading'];
		/** Optional supporting line under the title. */
		subheading?: BannerProps['subheading'];
		/** Leading icon, typically a `Stamp` snippet. */
		leading?: BannerProps['leading'];
		/** Page-level actions, flushed right. */
		trailing?: BannerProps['trailing'];
		/** Ancestor trail for drill-down pages, rendered above the title. */
		breadcrumb?: PageBreadcrumbItem[];
		/**
		 * Context navigation — links to *sibling pages*. Filters belong in the
		 * well's toolbar instead, so the two levels stay legible.
		 */
		nav?: Snippet;
		/** `data-testid` for the header root. */
		testId?: string;
	}

	const { heading, subheading, leading, trailing, breadcrumb, nav, testId }: Props = $props();

	const hasBreadcrumb = $derived((breadcrumb?.length ?? 0) > 0);

	// Pindoba's Breadcrumb marks the current page from `current`, so flag the
	// last crumb rather than relying on the absence of an `href` — intermediate
	// crumbs can legitimately be unlinked too.
	const crumbs = $derived<BreadcrumbItemData[]>(
		(breadcrumb ?? []).map((crumb, index) => ({
			label: crumb.label,
			href: crumb.href,
			current: index === (breadcrumb?.length ?? 0) - 1
		}))
	);
</script>

{#snippet breadcrumbRow()}
	<Breadcrumb items={crumbs} size="sm" data-testid="page-breadcrumb" />
{/snippet}

<!--
	The one page-header contract: breadcrumb → title → description → actions,
	with an optional context-nav row flush against the well below. Built on
	Banner so it inherits the eyebrow/heading/subheading typography scale rather
	than each page inventing its own `<h1 fontSize:md>` / `<h2 textStyle:2xl>`.
-->
<div
	class={css({
		display: 'flex',
		flexDirection: 'column',
		gap: 'sm',
		flexShrink: '0',
		position: 'relative',
		zIndex: '20',
		px: 'md',
		pt: 'md',
		// No bottom padding when a context-nav row is present: the tabs sit flush
		// on top of the well below.
		pb: nav ? '0' : 'md'
	})}
	data-testid={testId}
>
	<Banner
		headingLevel={1}
		size="sm"
		{leading}
		eyebrow={hasBreadcrumb ? breadcrumbRow : undefined}
		{heading}
		{subheading}
		{trailing}
		layout={{
			// `stretch`, not `center`: with `leading.span: 'above'` the Banner root
			// becomes a *column*, so `root.align` is the horizontal axis. Centring it
			// shrink-wraps the title row and floats it to the middle of the page;
			// stretching it back to full width also restores the trailing actions to
			// the right edge (the heading group is `flex: 1` inside that row).
			root: { align: 'stretch' },
			trailing: { align: 'center' },
			// The icon flanks the title only, rather than centring itself across the
			// whole text block: the subheading then runs full-width underneath it,
			// so a long repository path isn't indented past the icon column.
			leading: { span: 'above' }
		}}
	/>

	{#if nav}
		<!-- Indented by the well's own toolbar padding so the context tabs line up
		     with the filter row directly beneath them, rather than with the title
		     above. They still sit flush on the well's top edge. -->
		<div class={css({ display: 'flex', minWidth: '0', paddingLeft: 'md' })}>
			{@render nav()}
		</div>
	{/if}
</div>
