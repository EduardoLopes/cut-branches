import { createRawSnippet } from 'svelte';
import PageToolbar from '../page-toolbar.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('PageToolbar Component', () => {
	test('renders container with correct structure', () => {
		const leftSnippet = createRawSnippet(() => {
			return {
				render: () => '<div>Left</div>'
			};
		});
		const rightSnippet = createRawSnippet(() => {
			return {
				render: () => '<div>Right</div>'
			};
		});

		const screen = renderWithTestWrapper(PageToolbar, {
			left: leftSnippet,
			right: rightSnippet
		});
		expect(screen.getByTestId('bulk-actions-container')).toBeInTheDocument();
		expect(screen.getByTestId('bulk-actions-left')).toBeInTheDocument();
		expect(screen.getByTestId('bulk-actions-right')).toBeInTheDocument();
	});

	test('renders empty sections when no snippets are provided', () => {
		const screen = renderWithTestWrapper(PageToolbar);
		const leftSection = screen.getByTestId('bulk-actions-left');
		const rightSection = screen.getByTestId('bulk-actions-right');

		expect(leftSection).toBeInTheDocument();
		expect(rightSection).toBeInTheDocument();
		expect(leftSection).toHaveTextContent('');
		expect(rightSection).toHaveTextContent('');
	});

	test('renders the bottom placement', () => {
		const screen = renderWithTestWrapper(PageToolbar, { placement: 'bottom' });

		expect(screen.getByTestId('bulk-actions-container')).toBeInTheDocument();
	});

	test('forwards additional HTML attributes to root element', () => {
		const screen = renderWithTestWrapper(PageToolbar, {
			'data-custom': 'test-value'
		});
		const container = screen.getByTestId('bulk-actions-container');
		expect(container).toHaveAttribute('data-custom', 'test-value');
	});
});
