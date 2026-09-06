<script lang="ts">
	// import { createGetRepositoryQuery } from '$infrastructure/queries/create-get-repository-query';
	// This is a test fixture that combines SidebarView and Repository components
	// for integration testing
	import ActiveBranchesView from '$domains/branch-management/views/active-branches-view.svelte';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import SidebarView from '$domains/repository-navigation/views/sidebar-view.svelte';
	import { css } from '@pindoba/styled-system/css';

	// Define props using $props()
	const { id }: { id: string } = $props();
</script>

<div class={css({ display: 'flex', width: '100%' })}>
	<div class={css({ width: '250px' })} data-testid="menu-container">
		<SidebarView />
	</div>
	<div class={css({ flex: 1 })} data-testid="repository-container">
		<Repository repositoryId={id}>
			<ActiveBranchesView {id} />
		</Repository>
	</div>
</div>
