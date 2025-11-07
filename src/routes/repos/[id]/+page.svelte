<script lang="ts">
	import { page } from '$app/state';
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/styled-system/css';

	const id = $derived(page.params.id ?? '');
</script>

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository repositoryId={id}>
		<ActiveBranchesView {id} />
	</Repository>
</div>
