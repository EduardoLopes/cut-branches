<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import { Choice, ChoiceItem } from '@pindoba/svelte-choice';
	import Stamp from '@pindoba/svelte-stamp';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { useWorktreesView } from '$domains/worktree-management/core/composables/use-worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';

	/**
	 * Primary repository context switch (Branches / Worktrees; Stashes later).
	 * Delivery-layer composition glue used by the repository routes: it reads the
	 * feature flag and repository, and navigates between the branches and
	 * worktrees routes. The active option is derived from the URL so it survives
	 * reload and stays correct when navigating.
	 */
	interface Props {
		/** Repository id. */
		id: string;
	}

	let { id }: Props = $props();

	const repositoryQuery = createGetRepositoryQuery(() => ({ id }), { enabled: () => !!id });
	const repoPath = $derived(repositoryQuery.data?.path ?? '');
	// A linked worktree shares its repo with the main worktree, so worktree
	// management belongs to the main worktree — don't offer the switch there.
	const isLinkedWorktree = $derived(repositoryQuery.data?.isWorktree ?? false);
	const enabled = $derived(isFeatureEnabled('worktree-management') && !isLinkedWorktree);

	// The route is the source of truth for the active context.
	const currentContext = $derived(
		page.url.pathname.endsWith('/worktrees') ? 'worktrees' : 'branches'
	);

	// Worktree count for the badge (shares the cached list query the view uses).
	const worktreesView = useWorktreesView({ getPath: () => (enabled ? repoPath : '') });
	const worktreeCount = $derived(worktreesView.linkedCount);

	function goToContext(next: 'branches' | 'worktrees') {
		if (next === currentContext) return;
		goto(resolve(next === 'worktrees' ? `/repos/${id}/worktrees` : `/repos/${id}`));
	}
</script>

{#if enabled}
	<!--
		Keyed on the route-derived context so the Choice's internal selection can
		never drift from the active route (it can reset its own state on a
		re-render, which would otherwise swallow the next click).
	-->
	{#key currentContext}
		<Choice
			type="radio"
			appearance="button"
			size="md"
			defaultValue={[currentContext]}
			onValueChange={(value) => {
				const next = value[0];
				if (next === 'branches' || next === 'worktrees') goToContext(next);
			}}
			aria-label="Repository context"
			data-testid="repository-context-switch"
		>
			<ChoiceItem value="branches" label="Branches" data-testid="context-branches">
				{#snippet leading()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:git-branch" width="14px" height="14px" />
					</Stamp>
				{/snippet}
			</ChoiceItem>
			<ChoiceItem value="worktrees" label="Worktrees" data-testid="context-worktrees">
				{#snippet leading()}
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon="lucide:trees" width="14px" height="14px" />
					</Stamp>
				{/snippet}
				{#snippet trailing()}
					<Badge size="sm" emphasis="adaptive" data-testid="context-worktrees-count">
						{worktreeCount}
					</Badge>
				{/snippet}
			</ChoiceItem>
		</Choice>
	{/key}
{/if}
