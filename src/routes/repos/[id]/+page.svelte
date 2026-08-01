<script lang="ts">
	// Thin composition root: the repository header, context tabs and options menu
	// come from `+layout.svelte`; this page supplies only the active-branches body.
	import { page } from '$app/state';
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<ActiveBranchesView {id} />
