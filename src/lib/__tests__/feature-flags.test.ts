import { describe, it, expect, beforeEach } from 'vitest';
import {
	FEATURE_FLAGS,
	getVisibleFeatureFlags,
	isFeatureEnabled,
	isFeatureFlagsSectionVisible,
	resetFeatureFlags,
	resolveFeatureFlag,
	resolveFeatureFlagsSectionVisible,
	setFeatureFlag,
	toggleFeatureFlag,
	type FeatureFlagDefinition
} from '../feature-flags.svelte';

const DEFINITIONS: FeatureFlagDefinition[] = [
	{ key: 'on-by-default', label: 'On', description: '', defaultEnabled: true },
	{ key: 'off-by-default', label: 'Off', description: '', defaultEnabled: false }
];

const HIDDEN: FeatureFlagDefinition[] = [
	{ key: 'hidden-off', label: 'Hidden off', description: '', defaultEnabled: false, hidden: true },
	{ key: 'hidden-on', label: 'Hidden on', description: '', defaultEnabled: true, hidden: true }
];

describe('getVisibleFeatureFlags', () => {
	it('drops hidden flags and keeps the rest', () => {
		expect(getVisibleFeatureFlags([...DEFINITIONS, ...HIDDEN]).map((flag) => flag.key)).toEqual([
			'on-by-default',
			'off-by-default'
		]);
	});

	it('defaults to the real registry, which never surfaces branch diffs', () => {
		expect(getVisibleFeatureFlags().some((flag) => flag.key === 'branch-diff')).toBe(false);
	});
});

describe('resolveFeatureFlagsSectionVisible', () => {
	it('is visible whenever the registry has entries, regardless of build', () => {
		expect(resolveFeatureFlagsSectionVisible(DEFINITIONS, false)).toBe(true);
		expect(resolveFeatureFlagsSectionVisible(DEFINITIONS, true)).toBe(true);
	});

	it('is visible for an empty registry only in a dev build', () => {
		expect(resolveFeatureFlagsSectionVisible([], true)).toBe(true);
		expect(resolveFeatureFlagsSectionVisible([], false)).toBe(false);
	});

	it('treats a registry of only hidden flags as empty', () => {
		expect(resolveFeatureFlagsSectionVisible(HIDDEN, false)).toBe(false);
		expect(resolveFeatureFlagsSectionVisible(HIDDEN, true)).toBe(true);
	});
});

describe('isFeatureFlagsSectionVisible', () => {
	it('surfaces the section for the real (non-empty) registry', () => {
		expect(FEATURE_FLAGS.length).toBeGreaterThan(0);
		expect(isFeatureFlagsSectionVisible()).toBe(true);
	});
});

describe('resolveFeatureFlag', () => {
	it('returns a stored override when present, even when false', () => {
		expect(resolveFeatureFlag({ 'on-by-default': false }, DEFINITIONS, 'on-by-default')).toBe(
			false
		);
		expect(resolveFeatureFlag({ 'off-by-default': true }, DEFINITIONS, 'off-by-default')).toBe(
			true
		);
	});

	it('falls back to the registry default when there is no override', () => {
		expect(resolveFeatureFlag({}, DEFINITIONS, 'on-by-default')).toBe(true);
		expect(resolveFeatureFlag({}, DEFINITIONS, 'off-by-default')).toBe(false);
	});

	it('returns false for an unknown key with no override', () => {
		expect(resolveFeatureFlag({}, DEFINITIONS, 'does-not-exist')).toBe(false);
	});

	it('pins a hidden flag to its default, ignoring any override', () => {
		expect(resolveFeatureFlag({ 'hidden-off': true }, HIDDEN, 'hidden-off')).toBe(false);
		expect(resolveFeatureFlag({ 'hidden-on': false }, HIDDEN, 'hidden-on')).toBe(true);
	});
});

describe('feature flag store API', () => {
	beforeEach(() => {
		localStorage.clear();
		resetFeatureFlags();
	});

	it('registers the repository-cleanup flag (disabled by default)', () => {
		const cleanup = FEATURE_FLAGS.find((f) => f.key === 'repository-cleanup');
		expect(cleanup).toBeDefined();
		expect(cleanup?.defaultEnabled).toBe(false);
	});

	it('keeps the branch-diff flag hidden and off, even with an override stored', () => {
		const branchDiff = FEATURE_FLAGS.find((flag) => flag.key === 'branch-diff');
		expect(branchDiff?.hidden).toBe(true);
		expect(branchDiff?.defaultEnabled).toBe(false);

		setFeatureFlag('branch-diff', true);
		expect(isFeatureEnabled('branch-diff')).toBe(false);
	});

	it('defaults an unknown/undefined flag to disabled', () => {
		expect(isFeatureEnabled('anything')).toBe(false);
	});

	it('enables and disables a flag via setFeatureFlag', () => {
		setFeatureFlag('experimental', true);
		expect(isFeatureEnabled('experimental')).toBe(true);

		setFeatureFlag('experimental', false);
		expect(isFeatureEnabled('experimental')).toBe(false);
	});

	it('flips a flag via toggleFeatureFlag', () => {
		toggleFeatureFlag('experimental');
		expect(isFeatureEnabled('experimental')).toBe(true);

		toggleFeatureFlag('experimental');
		expect(isFeatureEnabled('experimental')).toBe(false);
	});

	it('persists overrides across store reads', () => {
		setFeatureFlag('experimental', true);
		// A fresh read goes through localStorage-backed state.
		expect(isFeatureEnabled('experimental')).toBe(true);
	});

	it('clears every override on reset', () => {
		setFeatureFlag('experimental', true);
		resetFeatureFlags();
		expect(isFeatureEnabled('experimental')).toBe(false);
	});
});
