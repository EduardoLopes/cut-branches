<script lang="ts">
	import type { MenuNode } from '@pindoba/core-menu';
	import type { Snippet } from 'svelte';
	import RepositoryHeader from '../components/repository-header.svelte';
	import type { PageBreadcrumbItem } from '$ui/patterns/page-header.svelte';
	import PageShell from '$ui/patterns/page-shell.svelte';

	interface Props {
		children?: Snippet;
		repositoryId: string;
		/** Extra options-menu actions composed in by the route (§1.3). */
		extraMenuItems?: MenuNode[];
		/** Context navigation rendered in the header, composed by the route (§1.3). */
		contextNav?: Snippet;
		/** Ancestor trail for drill-down pages, composed by the route. */
		breadcrumb?: PageBreadcrumbItem[];
	}

	const { children, repositoryId, extraMenuItems = [], contextNav, breadcrumb }: Props = $props();
</script>

<PageShell testId="repository-view">
	<RepositoryHeader {repositoryId} {extraMenuItems} {contextNav} {breadcrumb} />
	{#if children}
		{@render children()}
	{/if}
</PageShell>
