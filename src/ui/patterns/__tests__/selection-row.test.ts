import { createRawSnippet } from 'svelte';
import { describe, expect, test, vi } from 'vitest';
import SelectionRow from '../selection-row.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';
import { css } from '@pindoba/styled-system/css';

const body = createRawSnippet(() => ({ render: () => '<span>cut-branches</span>' }));
const badge = createRawSnippet(() => ({ render: () => '<span>Added</span>' }));

describe('SelectionRow', () => {
	test('renders a full-width checkbox row and forwards label and test id', async () => {
		const onchange = vi.fn();
		const screen = await renderWithTestWrapper(SelectionRow, {
			checked: false,
			onchange,
			ariaLabel: 'cut-branches',
			testId: 'row',
			children: body
		});

		const row = screen.getByTestId('row');
		expect(row).toHaveTextContent('cut-branches');
		expect(row.element().querySelector('input')).not.toBeChecked();
		expect(row.element().getAttribute('aria-label')).toBe('cut-branches');

		await row.click();
		expect(onchange).toHaveBeenCalledTimes(1);
	});

	test('reflects the checked state and renders the trailing addon', async () => {
		const screen = await renderWithTestWrapper(SelectionRow, {
			checked: true,
			onchange: vi.fn(),
			testId: 'row',
			children: body,
			trailing: badge
		});

		const row = screen.getByTestId('row').element();
		expect(row.querySelector('input')).toBeChecked();
		expect(row).toMatchTextContent('Added');
		// Selected rows lift to the dialog surface.
		expect(row.className).toContain('bg_neutral.surface.peak');
		expect(row.className).not.toContain('bg_danger');
	});

	test('climbs the danger ladder only when checked', async () => {
		const checked = await renderWithTestWrapper(SelectionRow, {
			checked: true,
			onchange: vi.fn(),
			feedback: 'danger',
			testId: 'danger-checked',
			children: body
		});
		expect(checked.getByTestId('danger-checked').element().className).toContain(
			'bg_danger.surface.peak'
		);

		const unchecked = await renderWithTestWrapper(SelectionRow, {
			checked: false,
			onchange: vi.fn(),
			feedback: 'danger',
			testId: 'danger-unchecked',
			children: body
		});
		expect(unchecked.getByTestId('danger-unchecked').element().className).not.toContain(
			'bg_danger'
		);
	});

	test('mutes an already-handled row: disabled, dimmed by the checkbox, no lift', async () => {
		const screen = await renderWithTestWrapper(SelectionRow, {
			checked: true,
			disabled: true,
			muted: true,
			onchange: vi.fn(),
			testId: 'row',
			children: body
		});

		const row = screen.getByTestId('row').element() as HTMLElement;
		expect(row.querySelector('input')).toBeDisabled();
		expect(parseFloat(getComputedStyle(row).opacity)).toBeLessThan(1);
		expect(row.className).toContain('bg_transparent');
		expect(row.className).not.toContain('bg_neutral.surface.peak');
	});

	test('accepts a radius and extra classes', async () => {
		const screen = await renderWithTestWrapper(SelectionRow, {
			checked: false,
			onchange: vi.fn(),
			radius: 'md',
			class: css({ marginTop: 'lg' }),
			testId: 'row',
			children: body
		});

		const row = screen.getByTestId('row').element() as HTMLElement;
		expect(getComputedStyle(row).marginTop).not.toBe('0px');
	});
});
