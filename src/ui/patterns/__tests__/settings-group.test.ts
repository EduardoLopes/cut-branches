import { createRawSnippet } from 'svelte';
import { describe, it, expect } from 'vitest';
import SettingsGroup from '../settings-group.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="group-controls">controls</div>'
}));

describe('SettingsGroup', () => {
	it('renders the heading and description beside the controls', async () => {
		const screen = await renderWithTestWrapper(SettingsGroup, {
			heading: 'Deletion',
			description: 'What happens to selected folders.',
			testId: 'deletion-group',
			children
		});

		expect(screen.getByRole('heading', { level: 2, name: 'Deletion' })).toBeInTheDocument();
		expect(screen.getByText('What happens to selected folders.')).toBeInTheDocument();
		expect(screen.getByTestId('deletion-group')).toBeInTheDocument();
		expect(screen.getByTestId('group-controls')).toBeInTheDocument();
	});

	it('renders without a description', async () => {
		const screen = await renderWithTestWrapper(SettingsGroup, { heading: 'Detection', children });

		expect(screen.getByRole('heading', { level: 2, name: 'Detection' })).toBeInTheDocument();
		expect(screen.getByTestId('group-controls')).toBeInTheDocument();
	});

	it('leads with a separator that the section can hide on the first group', async () => {
		const screen = await renderWithTestWrapper(SettingsGroup, {
			heading: 'Detection',
			testId: 'detection-group',
			children
		});

		const root = screen.getByTestId('detection-group').element();
		expect(root.querySelector('[data-settings-group-separator]')).not.toBeNull();
	});
});
