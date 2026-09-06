import { describe, it, expect, vi } from 'vitest';
import FeatureFlagToggle from '../feature-flag-toggle.svelte';
import type { FeatureFlagDefinition } from '$lib/feature-flags.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const flag: FeatureFlagDefinition = {
	key: 'demo-flag',
	label: 'Demo flag',
	description: 'Gates the demo feature.',
	defaultEnabled: false
};

describe('FeatureFlagToggle', () => {
	it('renders the label and description', async () => {
		const screen = await renderWithTestWrapper(FeatureFlagToggle, {
			flag,
			enabled: false,
			onToggle: vi.fn()
		});

		expect(screen.getByText('Demo flag')).toBeInTheDocument();
		expect(screen.getByText('Gates the demo feature.')).toBeInTheDocument();
	});

	it('reflects the enabled state in the checkbox', async () => {
		const screen = await renderWithTestWrapper(FeatureFlagToggle, {
			flag,
			enabled: true,
			onToggle: vi.fn()
		});

		await expect
			.element(screen.getByRole('checkbox', { name: 'Demo flag', exact: false }))
			.toBeChecked();
	});

	it('calls onToggle with the negated value when changed', async () => {
		const onToggle = vi.fn();
		const screen = await renderWithTestWrapper(FeatureFlagToggle, {
			flag,
			enabled: false,
			onToggle
		});

		await screen.getByTestId('feature-flag-checkbox-demo-flag').click();

		expect(onToggle).toHaveBeenCalledWith(true);
	});
});
