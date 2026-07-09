<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import RepositoryContextSwitch from '$components/repository-context-switch.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import WorktreesView from '$domains/worktree-management/views/worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { css } from '@pindoba/styled-system/css';

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

{#snippet contextSwitch()}
	<RepositoryContextSwitch {id} />
{/snippet}

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository repositoryId={id} {contextSwitch}>
		{#if enabled}
			<WorktreesView {id} />
		{/if}
	</Repository>
</div>
