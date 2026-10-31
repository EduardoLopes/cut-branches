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

	it('sits on the peak surface by default', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children });

		expect(screen.container.querySelector('main')).toHaveAttribute('data-background', 'peak');
	});

	it('sits on the valley surface when asked, so peak cards lift off it', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children, background: 'valley' });

		expect(screen.container.querySelector('main')).toHaveAttribute('data-background', 'valley');
	});

	it('omits the test id attribute when no testId is given', async () => {
		const screen = await renderWithTestWrapper(PageShell, { children });

		expect(screen.container.querySelector('main')).not.toHaveAttribute('data-testid');
	});
});
