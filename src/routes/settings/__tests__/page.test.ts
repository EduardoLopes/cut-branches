import { describe, it, expect, vi, beforeEach } from 'vitest';
// `vi.mock` is hoisted above imports, so `../+page` still resolves the mocks
// below despite this import sitting at the top.
import { load } from '../+page';

const h = vi.hoisted(() => ({ sectionVisible: false }));

vi.mock('$lib/feature-flags.svelte', () => ({
	isFeatureFlagsSectionVisible: () => h.sectionVisible
}));

// `resolve` is identity here — we only care which path the redirect targets.
vi.mock('$app/paths', () => ({
	resolve: (path: string) => path
}));

// SvelteKit's `redirect` throws; capture the status + location instead.
vi.mock('@sveltejs/kit', () => ({
	redirect: (status: number, location: string) => {
		throw { status, location };
	}
}));

beforeEach(() => {
	h.sectionVisible = false;
});

describe('/settings redirect', () => {
	it('sends to Feature flags when that section is surfaced', () => {
		h.sectionVisible = true;

		expect(() => load()).toThrow(
			expect.objectContaining({ status: 307, location: '/settings/feature-flags' })
		);
	});

	it('sends to About when Feature flags is hidden', () => {
		expect(() => load()).toThrow(
			expect.objectContaining({ status: 307, location: '/settings/about' })
		);
	});
});
