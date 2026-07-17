<script lang="ts">
	// Thin composition root: resolves the route params and mounts the
	// branch-management commit-history view.
	import { page } from '$app/state';
	import CommitHistoryView from '$domains/branch-management/features/commit-history/views/commit-history-view.svelte';

	const id = $derived(page.params.id ?? '');
	const targetCommit = $derived(page.url.searchParams.get('commit'));
</script>

<CommitHistoryView {id} {targetCommit} />
