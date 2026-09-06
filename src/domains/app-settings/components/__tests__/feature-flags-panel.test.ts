import { describe, it, expect, vi, beforeEach } from 'vitest';
import FeatureFlagsPanel from '../feature-flags-panel.svelte';
import type { FeatureFlagDefinition } from '$lib/feature-flags.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	flags: [] as FeatureFlagDefinition[],
	isEnabled: vi.fn((_key: string) => false),
	setFlag: vi.fn(),
	reset: vi.fn()
}));

vi.mock('$lib/feature-flags.svelte', () => ({
	// Stable array reference; tests mutate its contents in place.
	FEATURE_FLAGS: h.flags,
	getVisibleFeatureFlags: () => h.flags.filter((flag) => !flag.hidden),
	isFeatureEnabled: (key: string) => h.isEnabled(key),
	setFeatureFlag: (key: string, enabled: boolean) => h.setFlag(key, enabled),
	resetFeatureFlags: () => h.reset()
}));

const FLAGS: FeatureFlagDefinition[] = [
	{ key: 'alpha', label: 'Alpha', description: 'First flag', defaultEnabled: false },
	{ key: 'beta', label: 'Beta', description: 'Second flag', defaultEnabled: true }
];

const HIDDEN_FLAG: FeatureFlagDefinition = {
	key: 'gamma',
	label: 'Gamma',
	description: 'Hidden flag',
	defaultEnabled: false,
	hidden: true
};

beforeEach(() => {
	vi.clearAllMocks();
	h.flags.length = 0;
	h.isEnabled.mockImplementation(() => false);
});

describe('FeatureFlagsPanel', () => {
	it('shows an empty state and no reset button when the registry is empty', async () => {
		const screen = await renderWithTestWrapper(FeatureFlagsPanel);

		expect(screen.getByTestId('feature-flags-empty')).toBeInTheDocument();
		expect(screen.getByTestId('feature-flags-reset').elements().length).toBe(0);
	});

	it('treats a registry of only hidden flags as empty', async () => {
		h.flags.push(HIDDEN_FLAG);

		const screen = await renderWithTestWrapper(FeatureFlagsPanel);

		expect(screen.getByTestId('feature-flags-empty')).toBeInTheDocument();
		expect(screen.getByTestId('feature-flag-toggle').elements()).toHaveLength(0);
	});

	describe('with flags in the registry', () => {
		beforeEach(() => {
			h.flags.push(...FLAGS, HIDDEN_FLAG);
			h.isEnabled.mockImplementation((key: string) => key === 'beta');
		});

		it('renders a toggle per flag reflecting its effective value', async () => {
			const screen = await renderWithTestWrapper(FeatureFlagsPanel);

			expect(screen.getByTestId('feature-flag-toggle').elements()).toHaveLength(2);
			expect(screen.getByText('Alpha')).toBeInTheDocument();
			expect(screen.getByText('Beta')).toBeInTheDocument();
			// A hidden flag stays out of Settings entirely.
			expect(screen.getByText('Gamma').elements()).toHaveLength(0);
		});

		it('sets a flag when its toggle changes', async () => {
			const screen = await renderWithTestWrapper(FeatureFlagsPanel);

			await screen.getByTestId('feature-flag-checkbox-alpha').click();

			expect(h.setFlag).toHaveBeenCalledWith('alpha', true);
		});

		it('resets all flags from the reset button', async () => {
			const screen = await renderWithTestWrapper(FeatureFlagsPanel);

			await screen.getByTestId('feature-flags-reset').click();

			expect(h.reset).toHaveBeenCalled();
		});
	});
});
