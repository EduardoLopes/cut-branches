<script lang="ts">
	import { page } from '$app/state';
	import RestoreBranchesView from '$domains/branch-management/views/restore-branches-view.svelte';
</script>

<RestoreBranchesView id={page.params.id} />
