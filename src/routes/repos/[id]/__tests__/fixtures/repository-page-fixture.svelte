<script lang="ts">
	// This is a test fixture that combines Menu and Repository components
	// for integration testing
	import Menu from '$lib/components/menu.svelte';
	import Repository from '$lib/components/repository.svelte';
	import { createGetRepositoryByPathQuery } from '$lib/services/createGetRepositoryByPathQuery';
	import { css } from '@pindoba/panda/css';

	// Define props using $props()
	const { id }: { id: string } = $props();

	// Use $effect to trigger refetch when id changes, simulating component logic
	$effect(() => {
		if (id) {
			const query = createGetRepositoryByPathQuery(() => id, {
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
