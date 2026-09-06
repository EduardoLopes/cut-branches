import { createRawSnippet } from 'svelte';
import { describe, expect, test } from 'vitest';
import DialogToolbar from '../dialog-toolbar.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const controls = createRawSnippet(() => ({ render: () => '<div>Change folder</div>' }));

describe('DialogToolbar', () => {
	test('renders its controls as a full-bleed strip', async () => {
		const screen = await renderWithTestWrapper(DialogToolbar, {
			children: controls,
			testId: 'toolbar'
		});

		const toolbar = screen.getByTestId('toolbar').element() as HTMLElement;
		expect(toolbar).toHaveTextContent('Change folder');
		// Negative margins pull it over the dialog content inset.
		expect(parseFloat(getComputedStyle(toolbar).marginLeft)).toBeLessThan(0);
		expect(getComputedStyle(toolbar).borderBottomWidth).toBe('1px');
	});
});
