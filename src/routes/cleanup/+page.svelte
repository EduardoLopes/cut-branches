<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BulkCleanupView from '$domains/repository-cleanup/views/bulk-cleanup-view.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';

	// The bulk cleanup page is gated by the feature flag; if it's off, send the
	// user back to their repositories.
	const enabled = $derived(isFeatureEnabled('repository-cleanup'));

	$effect(() => {
		if (!enabled) {
			goto(resolve('/repos'));
		}
	});
</script>

{#if enabled}
	<BulkCleanupView />
{/if}
