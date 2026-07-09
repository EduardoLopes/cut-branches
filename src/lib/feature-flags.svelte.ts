import { z } from 'zod/v4';
import { Store } from '$lib/store.svelte';

/**
 * Definition of a feature flag. Shown in Settings → Feature Flags and read
 * across the app to gate in-development features.
 */
export interface FeatureFlagDefinition {
	/** Stable identifier used in code (`isFeatureEnabled('...')`) and storage. */
	key: string;
	/** Human-readable name shown in the Settings page. */
	label: string;
	/** What the flag gates; shown as help text in Settings. */
	description: string;
	/** Effective value when the user hasn't overridden the flag. */
	defaultEnabled: boolean;
	/** Optional Iconify icon name shown as a Stamp beside the flag in Settings. */
	icon?: string;
}

/**
 * Central registry of feature flags.
 *
 * To gate a new, in-development feature:
 *   1. Add an entry here with `defaultEnabled: false` so it ships hidden.
 *   2. Guard the feature in code with `isFeatureEnabled('<key>')` — the read is
 *      reactive, so toggling it in Settings updates the UI live.
 *   3. Flip `defaultEnabled` to `true` (or remove the flag) once it's ready.
 *
 * Example:
 *   {
 *     key: 'branch-graph',
 *     label: 'Branch graph',
 *     description: 'Show the experimental commit graph on the branches view.',
 *     defaultEnabled: false
 *   }
 */
export const FEATURE_FLAGS: readonly FeatureFlagDefinition[] = [
	{
		key: 'repository-cleanup',
		label: 'Repository cleanup',
		description:
			'Reclaim disk space by deleting stale dependency/build folders (node_modules, target, …). Adds a per-repository cleanup action and a bulk cleanup page.',
		defaultEnabled: false,
		icon: 'lucide:brush-cleaning'
	},
	{
		key: 'worktree-management',
		label: 'Worktree management',
		description:
			'Manage git worktrees for a repository — list, add, remove, and lock worktrees. Adds a worktrees section to the repository view.',
		defaultEnabled: false,
		icon: 'lucide:trees'
	}
];

/** A feature flag key. */
export type FeatureFlagKey = string;

const overridesSchema = z.record(z.string(), z.boolean());
type FeatureFlagOverrides = z.infer<typeof overridesSchema>;

/** Persisted, reactive store of user overrides keyed by flag key. */
function getOverridesStore() {
	return Store.getInstance<FeatureFlagOverrides>(['feature-flags'], overridesSchema, {});
}

/**
 * Pure resolution of a flag's effective value: a stored override wins,
 * otherwise the registry default, otherwise `false` for unknown keys. Exported
 * for testing so the branching is covered without seeding the registry.
 */
export function resolveFeatureFlag(
	overrides: FeatureFlagOverrides,
	definitions: readonly FeatureFlagDefinition[],
	key: string
): boolean {
	if (key in overrides) {
		return overrides[key];
	}
	return definitions.find((flag) => flag.key === key)?.defaultEnabled ?? false;
}

/**
 * Whether a feature flag is currently enabled. Reactive: reading this inside a
 * component or `$derived` re-runs when the flag is toggled.
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
	return resolveFeatureFlag(getOverridesStore().get() ?? {}, FEATURE_FLAGS, key);
}

/** Enable or disable a flag and persist the choice on this device. */
export function setFeatureFlag(key: FeatureFlagKey, enabled: boolean) {
	getOverridesStore().update({ [key]: enabled });
}

/** Flip a flag from its current effective value. */
export function toggleFeatureFlag(key: FeatureFlagKey) {
	setFeatureFlag(key, !isFeatureEnabled(key));
}

/** Clear all overrides, returning every flag to its registry default. */
export function resetFeatureFlags() {
	getOverridesStore().set({});
}
