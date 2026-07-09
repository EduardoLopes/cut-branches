<script lang="ts">
	import { page } from '$app/state';
	import RepositoryContextSwitch from '$components/repository-context-switch.svelte';
	import DeletedBranchesView from '$domains/branch-management/views/deleted-branches-view.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/styled-system/css';

	const id = $derived(page.params.id ?? '');
</script>

{#snippet contextSwitch()}
	<RepositoryContextSwitch {id} />
{/snippet}

<div
	class={css({
		width: 'full',
		height: 'full'
	})}
>
	<Repository repositoryId={id} {contextSwitch}>
		<DeletedBranchesView {id} />
	</Repository>
</div>
