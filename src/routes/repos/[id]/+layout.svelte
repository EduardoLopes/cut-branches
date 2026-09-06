<script lang="ts">
	import Icon from '@iconify/svelte';
	import type { MenuNode } from '@pindoba/core-menu';
	import Stamp from '@pindoba/svelte-stamp';
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import RepositoryContextTabs from '$components/repository-context-tabs.svelte';
	import CleanRepositoryModal from '$domains/repository-cleanup/components/clean-repository-modal.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { lastRepository } from '$lib/last-repository.svelte';
	import { resolveRepositoryPath, resolveRepositorySubPath } from '$lib/repository-route';
	import type { PageBreadcrumbItem } from '$ui/patterns/page-header.svelte';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();

	const id = $derived(page.params.id ?? '');

	// Every page under a repository passes through this layout, so this is the one
	// place that knows "the user is looking at this repository" — recorded here so
	// the next launch reopens it (see `$lib/last-repository`).
	$effect(() => {
		lastRepository.set(id);
	});

	// Composition root (§1.3, §4): the per-repository cleanup action lives in the
	// repository-cleanup domain, but is composed into repository-management's
	// options menu here so neither domain imports the other. Rendering this once
	// at the layout means every page under a repository gets the same header,
	// instead of each route re-wrapping (or skipping) it.
	let cleanupOpen = $state(false);

	const extraMenuItems = $derived<MenuNode[]>([
		...(isFeatureEnabled('commit-history')
			? [
					{
						type: 'action' as const,
						id: 'commit-history',
						label: 'Commit history…',
						leading: historyIcon,
						onSelect: () => goto(resolveRepositorySubPath(id, 'history'))
					}
				]
			: []),
		...(isFeatureEnabled('repository-cleanup')
			? [
					{
						type: 'action' as const,
						id: 'cleanup',
						label: 'Clean up…',
						leading: cleanupIcon,
						onSelect: () => (cleanupOpen = true)
					}
				]
			: [])
	]);

	// Branches is the only context until worktrees are available, and a lone tab
	// is noise — so the header's nav row is withheld entirely rather than handed
	// a snippet that renders nothing and still reserves its space.
	const repositoryQuery = createGetRepositoryQuery(() => ({ id }), { enabled: () => !!id });
	const hasContextNav = $derived(
		isFeatureEnabled('worktree-management') && !(repositoryQuery.data?.isWorktree ?? false)
	);

	// Drill-down pages keep the repository header and gain a trail back up to it,
	// so you never lose track of which repository you're inside.
	const breadcrumb = $derived.by<PageBreadcrumbItem[] | undefined>(() => {
		const path = page.url.pathname;
		const isHistory = path.endsWith('/history');
		const isDiff = path.endsWith('/diff');
		if (!isHistory && !isDiff) return undefined;

		// Only real pages become crumbs. The diff's target branch used to sit in
		// the middle here, but Breadcrumb treats any href-less item as the current
		// page (`current || !href`), so an unlinked crumb produced a second
		// `aria-current`. The branch is already a badge in the diff toolbar.
		return [
			{ label: 'Branches', href: resolveRepositoryPath(id) },
			{ label: isHistory ? 'Commit history' : 'Changes' }
		];
	});
</script>

{#snippet cleanupIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:brush-cleaning" width="14px" height="14px" />
	</Stamp>
{/snippet}

{#snippet historyIcon()}
	<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
		<Icon icon="lucide:git-commit-horizontal" width="14px" height="14px" />
	</Stamp>
{/snippet}

{#snippet contextNav()}
	<RepositoryContextTabs {id} />
{/snippet}

<Repository
	repositoryId={id}
	{extraMenuItems}
	contextNav={hasContextNav ? contextNav : undefined}
	{breadcrumb}
>
	{@render children?.()}
</Repository>

{#if isFeatureEnabled('repository-cleanup')}
	<CleanRepositoryModal repositoryId={id} bind:open={cleanupOpen} />
{/if}
