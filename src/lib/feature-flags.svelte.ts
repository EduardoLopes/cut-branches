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
	/**
	 * When true the flag is not listed in Settings and any persisted override is
	 * ignored, so `defaultEnabled` is its effective value. Use it to keep a
	 * feature completely out of users' reach while its code stays in the tree.
	 */
	hidden?: boolean;
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
 * To take a feature out of users' reach entirely, add `hidden: true`: the flag
 * disappears from Settings and any override already saved on a device stops
 * counting, so `defaultEnabled` always wins.
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
	},
	{
		key: 'branch-diff',
		label: 'Branch & commit diffs',
		description:
			'Review the changes of a branch or commit — a changed-files list with expandable, syntax-highlighted diffs. Adds diff deep-links to branch cards and history rows.',
		defaultEnabled: false,
		icon: 'lucide:file-diff',
		// Hidden until the diff viewer is ready: not listed in Settings and not
		// user-enablable, even on devices that toggled it on before.
		hidden: true
	},
	{
		key: 'commit-history',
		label: 'Commit history',
		description:
			"Browse a repository's commit history and branch graph. Adds a per-branch history deep-link, a hover graph preview, and a dedicated history view.",
		defaultEnabled: false,
		icon: 'lucide:git-graph'
	}
];

/** The flags surfaced in Settings — everything not marked `hidden`. */
export function getVisibleFeatureFlags(
	definitions: readonly FeatureFlagDefinition[] = FEATURE_FLAGS
): readonly FeatureFlagDefinition[] {
	return definitions.filter((flag) => !flag.hidden);
}

/** A feature flag key. */
export type FeatureFlagKey = string;

const overridesSchema = z.record(z.string(), z.boolean());
type FeatureFlagOverrides = z.infer<typeof overridesSchema>;

/** Persisted, reactive store of user overrides keyed by flag key. */
function getOverridesStore() {
	return Store.getInstance<FeatureFlagOverrides>(['feature-flags'], overridesSchema, {});
}

/**
 * Pure resolution of a flag's effective value: a `hidden` flag is pinned to its
 * registry default (overrides can't reach it), otherwise a stored override
 * wins, otherwise the registry default, otherwise `false` for unknown keys.
 * Exported for testing so the branching is covered without seeding the
 * registry.
 */
export function resolveFeatureFlag(
	overrides: FeatureFlagOverrides,
	definitions: readonly FeatureFlagDefinition[],
	key: string
): boolean {
	const definition = definitions.find((flag) => flag.key === key);
	if (definition?.hidden) {
		return definition.defaultEnabled;
	}
	if (key in overrides) {
		return overrides[key];
	}
	return definition?.defaultEnabled ?? false;
}

/**
 * Whether a feature flag is currently enabled. Reactive: reading this inside a
 * component or `$derived` re-runs when the flag is toggled.
 */
export function isFeatureEnabled(key: FeatureFlagKey): boolean {
	return resolveFeatureFlag(getOverridesStore().get() ?? {}, FEATURE_FLAGS, key);
}

/**
 * Pure decision for whether the Feature flags settings section should be
 * surfaced: shown when the registry has entries, or — for the dev-only empty
 * state — whenever we're in a development build. Exported for testing so both
 * branches are covered without emptying the real registry.
 */
export function resolveFeatureFlagsSectionVisible(
	definitions: readonly FeatureFlagDefinition[],
	isDev: boolean
): boolean {
	return getVisibleFeatureFlags(definitions).length > 0 || isDev;
}

/**
 * Whether to surface the Feature flags settings section (nav item + redirect
 * target). An empty registry is a dev-only state: the section stays reachable
 * in development so the "add a flag" guidance is discoverable, but it is hidden
 * from production builds. Keep in sync with the empty-state message gate in
 * `feature-flags-panel.svelte`.
 */
export function isFeatureFlagsSectionVisible(): boolean {
	return resolveFeatureFlagsSectionVisible(FEATURE_FLAGS, import.meta.env.DEV);
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
