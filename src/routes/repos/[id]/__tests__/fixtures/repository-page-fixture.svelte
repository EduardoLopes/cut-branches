<script lang="ts">
	// import { createGetRepositoryQuery } from '$domains/repository-management/core/composables/queries/create-get-repository-query';
	// This is a test fixture that combines MenuView and Repository components
	// for integration testing
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import MenuView from '$domains/repository-navigation/views/menu-view.svelte';
	import { css } from '@pindoba/panda/css';

	// Define props using $props()
	const { id }: { id: string } = $props();
</script>

<div class={css({ display: 'flex', width: '100%' })}>
	<div class={css({ width: '250px' })} data-testid="menu-container">
		<MenuView />
	</div>
	<div class={css({ flex: 1 })} data-testid="repository-container">
		<Repository>
			<ActiveBranchesView {id} />
		</Repository>
	</div>
</div>
