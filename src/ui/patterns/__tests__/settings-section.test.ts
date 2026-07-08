import { createRawSnippet } from 'svelte';
import { describe, it, expect } from 'vitest';
import SettingsSection from '../settings-section.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="section-body">body</div>'
}));

describe('SettingsSection', () => {
	it('renders the heading, subheading and children in the well', () => {
		const screen = renderWithTestWrapper(SettingsSection, {
			heading: 'Feature flags',
			subheading: 'Turn features on or off',
			testId: 'flags-section',
			children
		});

		expect(screen.getByText('Feature flags')).toBeInTheDocument();
		expect(screen.getByText('Turn features on or off')).toBeInTheDocument();
		expect(screen.getByTestId('flags-section')).toBeInTheDocument();
		expect(screen.getByTestId('section-body')).toBeInTheDocument();
	});

	it('renders a trailing header action when provided', () => {
		const trailing = createRawSnippet(() => ({
			render: () => '<button data-testid="section-action">Reset</button>'
		}));

		const screen = renderWithTestWrapper(SettingsSection, {
			heading: 'Cleanup',
			trailing,
			children
		});

		expect(screen.getByTestId('section-action')).toBeInTheDocument();
	});

	it('renders without a trailing action', () => {
		const screen = renderWithTestWrapper(SettingsSection, {
			heading: 'About',
			children
		});

		expect(screen.getByText('About')).toBeInTheDocument();
		expect(screen.getByTestId('section-body')).toBeInTheDocument();
	});
});
