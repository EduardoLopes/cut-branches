<script lang="ts">
	// Thin composition root: resolves the route params and mounts the
	// branch-management commit-history view.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CommitHistoryView from '$domains/branch-management/features/commit-history/views/commit-history-view.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositoryPath } from '$lib/repository-route';

	const id = $derived(page.params.id ?? '');
	const targetCommit = $derived(page.url.searchParams.get('commit'));
	const enabled = $derived(isFeatureEnabled('commit-history'));

	// Guard the route: with the flag off, send the user back to branches.
	$effect(() => {
		if (!enabled) {
			goto(resolveRepositoryPath(id));
		}
	});
</script>

{#if enabled}
	<CommitHistoryView {id} {targetCommit} />
{/if}
