import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import PageShell from '../page-shell.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const children = createRawSnippet(() => ({
	render: () => '<div data-testid="shell-body">body</div>'
}));

describe('PageShell', () => {
	it('renders its children inside a main landmark', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children });

		expect(screen.getByTestId('shell-body')).toBeInTheDocument();
		expect(screen.container.querySelector('main')).toBeInTheDocument();
	});

	it('applies the testId to the shell root when provided', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children, testId: 'my-page' });

		expect(screen.getByTestId('my-page')).toBeInTheDocument();
	});

	it('omits the test id attribute when no testId is given', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children });

		expect(screen.container.querySelector('main')).not.toHaveAttribute('data-testid');
	});
});
