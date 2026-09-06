import { createRawSnippet } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsShell from '../settings-shell.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	pathname: '/settings/feature-flags',
	// The Feature flags section shows by default; tests flip this to exercise the
	// hidden-when-empty-and-not-dev branch.
	sectionVisible: true,
	isEnabled: vi.fn((_key: string) => false)
}));

vi.mock('$app/state', () => ({
	page: {
		get url() {
			return { pathname: h.pathname };
		}
	}
}));

vi.mock('$lib/feature-flags.svelte', () => ({
	isFeatureFlagsSectionVisible: () => h.sectionVisible,
	isFeatureEnabled: (key: string) => h.isEnabled(key)
}));

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="section-content">section content</div>'
}));

beforeEach(() => {
	h.pathname = '/settings/feature-flags';
	h.sectionVisible = true;
	h.isEnabled.mockImplementation(() => false);
});

describe('SettingsShell', () => {
	it('renders the settings title and the section menu links', async () => {
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByText('Settings')).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Feature flags' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument();
	});

	it('renders the active section route content in the content area', async () => {
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByTestId('section-content')).toBeInTheDocument();
	});

	it('points each menu item at its own route', async () => {
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByRole('menuitem', { name: 'Feature flags' }).element()).toHaveAttribute(
			'href',
			'/settings/feature-flags'
		);
		expect(screen.getByRole('menuitem', { name: 'About' }).element()).toHaveAttribute(
			'href',
			'/settings/about'
		);
	});

	it('marks the section matching the current route as active', async () => {
		h.pathname = '/settings/about';
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByRole('menuitem', { name: 'About' }).element()).toHaveAttribute(
			'aria-current',
			'page'
		);
		expect(screen.getByRole('menuitem', { name: 'Feature flags' }).element()).not.toHaveAttribute(
			'aria-current'
		);
	});

	it('falls back to the first section when the route matches none', async () => {
		h.pathname = '/settings';
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByRole('menuitem', { name: 'Feature flags' }).element()).toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	it('hides the Feature flags nav item when the section is not surfaced', async () => {
		h.sectionVisible = false;
		h.pathname = '/settings/about';
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByRole('menuitem', { name: 'About' })).toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: 'Feature flags' }).elements().length).toBe(0);
	});

	it('falls back to the first remaining section when Feature flags is hidden', async () => {
		h.sectionVisible = false;
		h.pathname = '/settings';
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		expect(screen.getByRole('menuitem', { name: 'About' }).element()).toHaveAttribute(
			'aria-current',
			'page'
		);
	});

	it('renders without a children snippet', async () => {
		const screen = await renderWithTestWrapper(SettingsShell);

		expect(screen.getByText('Settings')).toBeInTheDocument();
		expect(screen.getByTestId('section-content').elements().length).toBe(0);
	});

	it('filters the section menu with the search input', async () => {
		const screen = await renderWithTestWrapper(SettingsShell, { children });

		await screen.getByPlaceholder('Search settings').fill('zzz');

		await vi.waitFor(() => expect(screen.getByTestId('settings-search-empty')).toBeInTheDocument());
	});
});
