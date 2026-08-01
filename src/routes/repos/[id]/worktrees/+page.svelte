<script lang="ts">
	// Thin composition root: the repository header and context tabs come from the
	// `[id]` layout; this page supplies only the worktrees body.
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import WorktreesView from '$domains/worktree-management/views/worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';

	const id = $derived(page.params.id ?? '');

	const repositoryQuery = createGetRepositoryQuery(() => ({ id }), { enabled: () => !!id });
	const isLinkedWorktree = $derived(repositoryQuery.data?.isWorktree ?? false);
	// Worktree management is available only for the main worktree with the flag on.
	const enabled = $derived(isFeatureEnabled('worktree-management') && !isLinkedWorktree);

	// Guard the route: if worktrees aren't available for this repo (flag off, or
	// the repo is itself a linked worktree), send the user back to branches. Wait
	// for the repository to resolve before deciding, so we don't bounce on load.
	$effect(() => {
		if (!isFeatureEnabled('worktree-management') || (repositoryQuery.data && isLinkedWorktree)) {
			goto(resolve(`/repos/${id}`));
		}
	});
</script>

{#if enabled}
	<WorktreesView {id} />
{/if}
