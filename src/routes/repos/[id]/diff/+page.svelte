<script lang="ts">
	// Thin composition root: resolves the route params and mounts the
	// branch-management diff view. The target arrives via search params —
	// `?branch=<name>` or `?commit=<sha>` (exactly one).
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import BranchDiffView from '$domains/branch-management/features/branch-diff/views/branch-diff-view.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositoryPath } from '$lib/repository-route';

	const id = $derived(page.params.id ?? '');
	const branchName = $derived(page.url.searchParams.get('branch'));
	const commitSha = $derived(page.url.searchParams.get('commit'));
	const enabled = $derived(isFeatureEnabled('branch-diff'));
	const hasTarget = $derived(Boolean(branchName) !== Boolean(commitSha));

	// Guard the route: with the flag off or no (single) target, go back to
	// the branches view.
	$effect(() => {
		if (!enabled || !hasTarget) {
			goto(resolveRepositoryPath(id));
		}
	});
</script>

{#if enabled && hasTarget}
	<BranchDiffView {id} {branchName} {commitSha} />
{/if}
