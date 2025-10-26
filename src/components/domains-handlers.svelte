<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { setupRepositoryDeletedHandler } from '$domains/branch-management/core/composables/repository-deleted-handler.svelte';
	import { setupAddRepositoryHandler } from '$domains/repository-management/core/composables/add-repository-handler.svelte';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();

	onMount(() => {
		// Setup all domain event handlers
		const addRepositoryHandler = setupAddRepositoryHandler();
		const repositoryDeletedHandler = setupRepositoryDeletedHandler();

		// Return combined cleanup function
		return () => {
			addRepositoryHandler.cleanup();
			repositoryDeletedHandler.cleanup();
		};
	});
</script>

{@render children?.()}
