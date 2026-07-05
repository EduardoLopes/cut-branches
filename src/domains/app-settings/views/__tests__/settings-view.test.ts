import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsView from '../settings-view.svelte';
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
	isFeatureEnabled: (key: string) => h.isEnabled(key),
	setFeatureFlag: (key: string, enabled: boolean) => h.setFlag(key, enabled),
	resetFeatureFlags: () => h.reset()
}));

const FLAGS: FeatureFlagDefinition[] = [
	{ key: 'alpha', label: 'Alpha', description: 'First flag', defaultEnabled: false },
	{ key: 'beta', label: 'Beta', description: 'Second flag', defaultEnabled: true }
];

beforeEach(() => {
	vi.clearAllMocks();
	h.flags.length = 0;
	h.isEnabled.mockImplementation(() => false);
});

describe('SettingsView', () => {
	it('renders the page heading and feature-flags section', () => {
		const screen = renderWithTestWrapper(SettingsView);

		expect(screen.getByText('Settings')).toBeInTheDocument();
		expect(screen.getByTestId('feature-flags-section')).toBeInTheDocument();
	});

	it('shows an empty state and no reset button when the registry is empty', () => {
		const screen = renderWithTestWrapper(SettingsView);

		expect(screen.getByTestId('feature-flags-empty')).toBeInTheDocument();
		expect(screen.getByTestId('feature-flags-reset').elements().length).toBe(0);
	});

	it('goes back when the back button is clicked', async () => {
		const back = vi.spyOn(window.history, 'back').mockImplementation(() => {});
		const screen = renderWithTestWrapper(SettingsView);

		await screen.getByTestId('settings-back').click();

		expect(back).toHaveBeenCalled();
		back.mockRestore();
	});

	describe('with flags in the registry', () => {
		beforeEach(() => {
			h.flags.length = 0;
			h.flags.push(...FLAGS);
			h.isEnabled.mockImplementation((key: string) => key === 'beta');
		});

		it('renders a toggle per flag reflecting its effective value', () => {
			const screen = renderWithTestWrapper(SettingsView);

			expect(screen.getByTestId('feature-flag-toggle').elements()).toHaveLength(2);
			expect(screen.getByText('Alpha')).toBeInTheDocument();
			expect(screen.getByText('Beta')).toBeInTheDocument();
		});

		it('sets a flag when its toggle changes', async () => {
			const screen = renderWithTestWrapper(SettingsView);

			await screen.getByTestId('feature-flag-checkbox-alpha').click();

			expect(h.setFlag).toHaveBeenCalledWith('alpha', true);
		});

		it('resets all flags from the reset button', async () => {
			const screen = renderWithTestWrapper(SettingsView);

			await screen.getByTestId('feature-flags-reset').click();

			expect(h.reset).toHaveBeenCalled();
		});
	});
});
