<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { setupAddRepositoryHandler } from '$domains/repository-management/logic/add-repository-handler.svelte';

	interface Props {
		children?: Snippet;
	}

	const { children }: Props = $props();

	onMount(() => {
		setupAddRepositoryHandler();
	});
</script>

{@render children?.()}
