<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import CleanupSettingsPanel from '$domains/repository-cleanup/components/cleanup-settings-panel.svelte';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';

	// This section is only reachable while the feature flag is on; if it's turned
	// off, fall back to the feature-flags section.
	const enabled = $derived(isFeatureEnabled('repository-cleanup'));

	$effect(() => {
		if (!enabled) {
			goto(resolve('/settings/feature-flags'));
		}
	});
</script>

{#if enabled}
	<CleanupSettingsPanel />
{/if}
