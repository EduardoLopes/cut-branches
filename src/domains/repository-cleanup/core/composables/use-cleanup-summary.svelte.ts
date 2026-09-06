import type { QueryClient } from '@tanstack/svelte-query';
import { getCleanupConfig } from './use-cleanup-config.svelte';
import { fetchStaleRepositories } from '$domains/repository-cleanup/infrastructure/queries/create-list-stale-repositories-query';
import { cleanupSummary } from '$lib/cleanup-summary.svelte';

/**
 * Warms the stale-repositories query cache at startup and records the total
 * reclaimable space in the shared {@link cleanupSummary} (which drives the
 * sidebar badge). Because it populates the same cache entry the cleanup page
 * uses, opening that page afterwards is a cache hit — no re-scan, no loading.
 * Best-effort: failures are swallowed so a background scan never shows an error.
 */
export async function refreshCleanupSummary(queryClient: QueryClient): Promise<void> {
	try {
		const output = await fetchStaleRepositories(queryClient, {
			thresholdDays: getCleanupConfig().thresholdDays
		});
		cleanupSummary.set(output.totalReclaimableBytes);
	} catch {
		// Best-effort background scan; leave the summary untouched on failure.
	}
}
