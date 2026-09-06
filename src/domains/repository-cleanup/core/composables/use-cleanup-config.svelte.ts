import { z } from 'zod/v4';
import type { DeletionMode } from '$infrastructure/bindings';
import { Store } from '$lib/store.svelte';

const cleanupConfigSchema = z.object({
	/** A repository is stale when its most recent activity is older than this. */
	thresholdDays: z.number().int().min(1),
	/** Deletion mode pre-selected in the confirm dialog. */
	defaultDeletionMode: z.enum(['trash', 'permanent'])
});

export type CleanupConfig = z.infer<typeof cleanupConfigSchema>;

const DEFAULT_CONFIG: CleanupConfig = {
	thresholdDays: 90,
	defaultDeletionMode: 'trash' satisfies DeletionMode
};

/** Persisted, reactive store of the cleanup configuration for this device. */
function getConfigStore() {
	return Store.getInstance<CleanupConfig>(['cleanup-config'], cleanupConfigSchema, DEFAULT_CONFIG);
}

/**
 * The current cleanup configuration. Reactive: reading this inside a component
 * or `$derived` re-runs when the config changes.
 */
export function getCleanupConfig(): CleanupConfig {
	return getConfigStore().get() ?? DEFAULT_CONFIG;
}

/** Apply a partial update to the cleanup configuration. */
export function setCleanupConfig(partial: Partial<CleanupConfig>) {
	getConfigStore().set({ ...getCleanupConfig(), ...partial });
}

/** Reset every cleanup setting to its default. */
export function resetCleanupConfig() {
	getConfigStore().set({ ...DEFAULT_CONFIG });
}
