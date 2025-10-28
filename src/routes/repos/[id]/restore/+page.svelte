<script lang="ts">
	import { css } from '@pindoba/styled-system/css';
	import { page } from '$app/state';
	import DeletedBranchesView from '$domains/branch-management/views/deleted-branches-view.svelte';
	import BranchRestorationHeader from '$domains/repository-management/components/branch-restoration-header.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';

	const id = $derived(page.params.id ?? '');
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository>
		<BranchRestorationHeader repositoryId={id} />
		<DeletedBranchesView {id} />
	</Repository>
</div>
