<script lang="ts">
	import Icon from '@iconify/svelte';
	import Badge from '@pindoba/svelte-badge';
	import Group from '@pindoba/svelte-group';
	import Radio from '@pindoba/svelte-radio';
	import Stamp from '@pindoba/svelte-stamp';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { useWorktreesView } from '$domains/worktree-management/core/composables/use-worktrees-view.svelte';
	import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositoryPath, resolveRepositorySubPath } from '$lib/repository-route';
	import { css } from '@pindoba/styled-system/css';

	/**
	 * Primary repository context navigation (Branches / Worktrees; Stashes later).
	 *
	 * Delivery-layer composition glue used by the repository layout: it reads the
	 * feature flag and repository, and navigates between the branches and
	 * worktrees routes. These are *sibling pages*, which is why they live in the
	 * page header — the Active/Deleted split is a filter over branches and lives
	 * in the branches toolbar instead.
	 *
	 * The active tab is derived from the URL so it survives reload and stays
	 * correct when navigating.
	 */
	interface Props {
		/** Repository id. */
		id: string;
	}

	let { id }: Props = $props();

	const repositoryQuery = createGetRepositoryQuery(() => ({ id }), { enabled: () => !!id });
	const repoPath = $derived(repositoryQuery.data?.path ?? '');
	const branchesCount = $derived(repositoryQuery.data?.branchesCount ?? 0);
	// A linked worktree shares its repo with the main worktree, so worktree
	// management belongs to the main worktree — don't offer the tab there.
	const isLinkedWorktree = $derived(repositoryQuery.data?.isWorktree ?? false);
	const worktreesEnabled = $derived(isFeatureEnabled('worktree-management') && !isLinkedWorktree);

	// The route is the source of truth for the active context.
	const currentContext = $derived(
		page.url.pathname.endsWith('/worktrees') ? 'worktrees' : 'branches'
	);

	// Worktree count for the badge (shares the cached list query the view uses).
	const worktreesView = useWorktreesView({ getPath: () => (worktreesEnabled ? repoPath : '') });
	const worktreeCount = $derived(worktreesView.linkedCount);

	function goToBranches() {
		if (currentContext !== 'branches') goto(resolveRepositoryPath(id));
	}

	function goToWorktrees() {
		if (currentContext !== 'worktrees') goto(resolveRepositorySubPath(id, 'worktrees'));
	}
</script>

{#if worktreesEnabled}
	<Group
		orientation="horizontal"
		aria-label="Repository context"
		data-testid="repository-context-switch"
		passThrough={{
			root: {
				// Overlap the well's top border so the selected tab reads as the same
				// surface as the content below it.
				style: css.raw({ marginBottom: '-1px' })
			}
		}}
	>
		<Radio
			id="context-branches"
			name="repository-context"
			value="branches"
			background="surface.valley"
			appearance="tab"
			checked={currentContext === 'branches'}
			role="tab"
			onchange={goToBranches}
			data-testid="context-branches"
		>
			Branches
			{#snippet leading()}
				<Stamp emphasis="ghost" feedback="neutral" border="muted" background="transparent">
					<Icon icon="lucide:git-branch" width="14px" height="14px" />
				</Stamp>
			{/snippet}
			{#snippet trailing()}
				<Badge size="sm">{branchesCount}</Badge>
			{/snippet}
		</Radio>

		<Radio
			id="context-worktrees"
			name="repository-context"
			value="worktrees"
			background="surface.valley"
			appearance="tab"
			checked={currentContext === 'worktrees'}
			role="tab"
			onchange={goToWorktrees}
			data-testid="context-worktrees"
		>
			Worktrees
			{#snippet leading()}
				<Stamp emphasis="ghost" feedback="neutral" border="muted" background="transparent">
					<Icon icon="lucide:trees" width="14px" height="14px" />
				</Stamp>
			{/snippet}
			{#snippet trailing()}
				<Badge size="sm" data-testid="context-worktrees-count">{worktreeCount}</Badge>
			{/snippet}
		</Radio>
	</Group>
{/if}
