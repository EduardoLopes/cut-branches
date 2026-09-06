import { flushSync } from 'svelte';
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod/v4';
import { Store } from '$lib/store.svelte';

const schema = z.record(z.string(), z.boolean());

/**
 * Store singletons are reached lazily through accessor functions
 * (`isFeatureEnabled()`, `getCleanupConfig()`, …) that are typically called
 * from inside a `$derived`. A `$state` source created while a reaction runs is
 * excluded from that run's dependencies, so without the registry-version
 * bump in `AbstractStore.getCommonInstance` the first reader would stay stuck
 * on the initial value until a full reload.
 */
describe('lazily created store singletons', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('notifies a reaction that created the instance itself', async () => {
		const getStore = () =>
			Store.getInstance<Record<string, boolean>>(['reactivity-probe'], schema, {});

		const seen: string[] = [];
		const cleanup = $effect.root(() => {
			$effect(() => {
				seen.push(JSON.stringify(getStore().get()));
			});
		});

		flushSync();
		// The creating run subscribes via the registry counter, which is bumped in
		// a microtask so the store's own source can be picked up on the re-run.
		await Promise.resolve();
		flushSync();

		getStore().update({ enabled: true });
		flushSync();
		cleanup();

		expect(seen.at(-1)).toBe('{"enabled":true}');
	});
});
