<script lang="ts">
	// This is a test fixture that combines Menu and Repository components
	// for integration testing
	import Menu from '$domains/navigation/components/menu.svelte';
	import { createGetRepositoryQuery } from '$domains/repository-management/services/create-get-repository-query';
	import Repository from '$domains/repository-management/views/repository-view.svelte';
	import { css } from '@pindoba/panda/css';

	// Define props using $props()
	const { id }: { id: string } = $props();

	// Use $effect to trigger refetch when id changes, simulating component logic
	$effect(() => {
		if (id) {
			const query = createGetRepositoryQuery(() => id, {
				enabled: !!id
			});
			if (query && typeof query.refetch === 'function') {
				query.refetch();
			}
		}
	});
</script>

<div class={css({ display: 'flex', width: '100%' })}>
	<div class={css({ width: '250px' })} data-testid="menu-container">
		<Menu />
	</div>
	<div class={css({ flex: 1 })} data-testid="repository-container">
		<Repository {id} />
	</div>
</div>
