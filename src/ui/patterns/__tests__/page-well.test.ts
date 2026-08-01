import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageWell from '../page-well.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="well-body">body</div>'
}));

const toolbar = createRawSnippet(() => ({
	render: () => '<div data-testid="well-toolbar">toolbar</div>'
}));

const footer = createRawSnippet(() => ({
	render: () => '<div data-testid="well-footer">footer</div>'
}));

describe('PageWell', () => {
	it('renders only its children when no toolbar or footer is given', () => {
		const screen = renderWithTestWrapper(PageWell, { children });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="well-toolbar"]')).toBeNull();
		expect(screen.container.querySelector('[data-testid="well-footer"]')).toBeNull();
	});

	it('renders the toolbar and footer slots when provided', () => {
		const screen = renderWithTestWrapper(PageWell, {
			children,
			toolbar,
			footer,
			testId: 'branches-well'
		});

		expect(screen.getByTestId('well-toolbar')).toBeInTheDocument();
		expect(screen.getByTestId('well-footer')).toBeInTheDocument();
		expect(screen.getByTestId('branches-well')).toBeInTheDocument();
	});

	it('still renders its children while loading', () => {
		const screen = renderWithTestWrapper(PageWell, { children, isLoading: true });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
	});

	it('renders unpadded content when padded is false', () => {
		const screen = renderWithTestWrapper(PageWell, { children, padded: false });

		expect(screen.getByTestId('well-body')).toBeInTheDocument();
	});
});
