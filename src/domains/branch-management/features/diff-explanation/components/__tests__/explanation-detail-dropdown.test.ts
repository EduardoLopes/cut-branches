import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ExplanationDetailDropdown from '../explanation-detail-dropdown.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

async function openMenu(screen: Awaited<ReturnType<typeof renderWithTestWrapper>>) {
	await screen.getByTestId('explanation-detail-trigger').click();
	await tick();
}

describe('ExplanationDetailDropdown', () => {
	it('offers whole-file and per-change options', async () => {
		const screen = await renderWithTestWrapper(ExplanationDetailDropdown, {
			detail: 'file',
			onChange: vi.fn()
		});
		await openMenu(screen);
		await expect
			.element(screen.getByRole('menuitemradio', { name: 'Whole file' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('menuitemradio', { name: 'Per change' }))
			.toBeInTheDocument();
	});

	it('reports the chosen detail', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(ExplanationDetailDropdown, {
			detail: 'file',
			onChange
		});
		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Per change' }).click();
		expect(onChange).toHaveBeenCalledWith('hunks');
	});
});
