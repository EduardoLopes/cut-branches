import { createRawSnippet } from 'svelte';
import { describe, expect, test } from 'vitest';
import DialogFooter from '../dialog-footer.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';
import { css } from '@pindoba/styled-system/css';

const buttons = createRawSnippet(() => ({
	render: () => '<div><button>Cancel</button><button>Save</button></div>'
}));

describe('DialogFooter', () => {
	test('right-aligns its children without a divider', async () => {
		const screen = await renderWithTestWrapper(DialogFooter, {
			children: buttons,
			testId: 'footer'
		});

		const footer = screen.getByTestId('footer').element() as HTMLElement;
		expect(footer).toMatchTextContent('Cancel');
		expect(getComputedStyle(footer).justifyContent).toBe('flex-end');
		expect(getComputedStyle(footer).borderTopWidth).toBe('0px');
	});

	test('merges extra classes', async () => {
		const screen = await renderWithTestWrapper(DialogFooter, {
			children: buttons,
			class: css({ marginTop: 'lg' }),
			testId: 'footer'
		});

		const footer = screen.getByTestId('footer').element() as HTMLElement;
		expect(getComputedStyle(footer).marginTop).not.toBe('0px');
	});
});
