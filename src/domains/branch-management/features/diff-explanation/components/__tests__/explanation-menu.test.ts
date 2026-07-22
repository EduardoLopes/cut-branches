import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import ExplanationMenu from '../explanation-menu.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const base = {
	style: 'succinct' as const,
	detail: 'file' as const,
	onStyleChange: vi.fn(),
	onDetailChange: vi.fn()
};

async function openMenu(screen: ReturnType<typeof renderWithTestWrapper>) {
	await screen.getByTestId('explanation-menu-trigger').click();
	await tick();
}

describe('ExplanationMenu', () => {
	it('lists both detail and style options', async () => {
		const screen = renderWithTestWrapper(ExplanationMenu, { ...base, onStyleChange: vi.fn() });
		await openMenu(screen);

		for (const name of ['Whole file', 'Per change']) {
			await expect.element(screen.getByRole('menuitemradio', { name })).toBeInTheDocument();
		}
		for (const name of ['Succinct', 'Detailed', 'Review-focused', 'Plain-language']) {
			await expect.element(screen.getByRole('menuitemradio', { name })).toBeInTheDocument();
		}
	});

	it('reports a detail change', async () => {
		const onDetailChange = vi.fn();
		const screen = renderWithTestWrapper(ExplanationMenu, { ...base, onDetailChange });
		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Per change' }).click();
		expect(onDetailChange).toHaveBeenCalledWith('hunks');
	});

	it('reports a style change', async () => {
		const onStyleChange = vi.fn();
		const screen = renderWithTestWrapper(ExplanationMenu, { ...base, onStyleChange });
		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Review-focused' }).click();
		expect(onStyleChange).toHaveBeenCalledWith('reviewFocused');
	});
});
