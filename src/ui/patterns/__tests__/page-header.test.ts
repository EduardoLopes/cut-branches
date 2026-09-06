import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageHeader from '../page-header.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const nav = createRawSnippet(() => ({
	render: () => '<div data-testid="page-nav">tabs</div>'
}));

const trailing = createRawSnippet(() => ({
	render: () => '<button data-testid="page-action">Act</button>'
}));

describe('PageHeader', () => {
	it('renders the heading and subheading', async () => {
		const screen = await renderWithTestWrapper(PageHeader, {
			heading: 'Commit history',
			subheading: '/Users/me/repo'
		});

		expect(screen.getByText('Commit history')).toBeInTheDocument();
		expect(screen.getByText('/Users/me/repo')).toBeInTheDocument();
	});

	it('renders a trailing action and the context nav row', async () => {
		const screen = await renderWithTestWrapper(PageHeader, {
			heading: 'Branches',
			trailing,
			nav,
			testId: 'branches-header'
		});

		expect(screen.getByTestId('page-action')).toBeInTheDocument();
		expect(screen.getByTestId('page-nav')).toBeInTheDocument();
		expect(screen.getByTestId('branches-header')).toBeInTheDocument();
	});

	it('omits the breadcrumb when none is given', async () => {
		const screen = await renderWithTestWrapper(PageHeader, { heading: 'Branches' });

		expect(screen.container.querySelector('[data-testid="page-breadcrumb"]')).toBeNull();
	});

	it('renders breadcrumb crumbs, linking every one but the current page', async () => {
		const screen = await renderWithTestWrapper(PageHeader, {
			heading: 'Changes',
			breadcrumb: [{ label: 'Branches', href: '/repos/r1' }, { label: 'Changes' }]
		});

		expect(screen.getByTestId('page-breadcrumb')).toBeInTheDocument();

		const link = screen.container.querySelector('a[href="/repos/r1"]');
		expect(link).toHaveTextContent('Branches');

		// Only the trailing crumb is the current page. Breadcrumb derives that from
		// `current || !href`, so every crumb but the last must carry an href.
		const current = screen.container.querySelectorAll('[aria-current="page"]');
		expect(current).toHaveLength(1);
		expect(current[0]).toHaveTextContent('Changes');
	});
});
