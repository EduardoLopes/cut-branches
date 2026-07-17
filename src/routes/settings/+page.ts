import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import { isFeatureFlagsSectionVisible } from '$lib/feature-flags.svelte';

// /settings has no content of its own — send it to the first section so the
// nav always has an active item. Each section is a real route beneath here.
// Feature flags lead whenever that section is surfaced (registry has entries,
// or a dev build); otherwise fall through to About, which is always present.
export const load = () => {
	redirect(
		307,
		resolve(isFeatureFlagsSectionVisible() ? '/settings/feature-flags' : '/settings/about')
	);
};
