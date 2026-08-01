<script lang="ts">
	// Thin composition root: the repository header comes from the `[id]` layout;
	// this page supplies only the deleted-branches body.
	import { page } from '$app/state';
	import DeletedBranchesView from '$domains/branch-management/views/deleted-branches-view.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<DeletedBranchesView {id} />
