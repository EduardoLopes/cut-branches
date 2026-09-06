import { tick } from 'svelte';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_DIFF_VIEW_OPTIONS } from '../../application/use-diff-view-options.svelte';
import DiffOptionsMenu from '../diff-options-menu.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

async function openMenu(screen: Awaited<ReturnType<typeof renderWithTestWrapper>>) {
	await screen.getByTestId('diff-options-trigger').click();
	await tick();
}

describe('DiffOptionsMenu', () => {
	it('lists layout, style, line numbers and wrapping controls', async () => {
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS },
			onChange: vi.fn()
		});

		await openMenu(screen);

		await expect
			.element(screen.getByRole('menuitemradio', { name: 'Unified' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('menuitemradio', { name: 'Background' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('menuitemradio', { name: 'Single column' }))
			.toBeInTheDocument();
		await expect
			.element(screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' }))
			.toBeInTheDocument();
	});

	it('reports a layout change', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS },
			onChange
		});

		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Split' }).click();

		expect(onChange).toHaveBeenCalledWith({ layout: 'split' });
	});

	it('reports a style change', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS },
			onChange
		});

		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Bars' }).click();

		expect(onChange).toHaveBeenCalledWith({ variant: 'bars' });
	});

	it('reports a gutter change', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS },
			onChange
		});

		await openMenu(screen);
		await screen.getByRole('menuitemradio', { name: 'Old / new' }).click();

		expect(onChange).toHaveBeenCalledWith({ gutter: 'double' });
	});

	it('omits the line-numbers group in split layout, where each side has its own number', async () => {
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS, layout: 'split' as const },
			onChange: vi.fn()
		});

		await openMenu(screen);

		await expect.element(screen.getByRole('menuitemradio', { name: 'Split' })).toBeInTheDocument();
		expect(
			screen.container.ownerDocument.querySelector('[role="menuitemradio"][data-value="single"]')
		).toBeNull();
		expect(screen.getByRole('menuitemradio', { name: 'Single column' }).elements()).toHaveLength(0);
	});

	it('locks wrapping on in split layout, where the viewer enforces it', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS, layout: 'split' as const },
			onChange
		});

		await openMenu(screen);
		const wrapItem = screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' });
		await expect.element(wrapItem).toHaveAttribute('aria-checked', 'true');
		await expect.element(wrapItem).toHaveAttribute('aria-disabled', 'true');

		// Playwright won't click a disabled row without force — exactly the
		// point; forcing it verifies the activation guard as well.
		await wrapItem.click({ force: true });
		expect(onChange).not.toHaveBeenCalled();
	});

	it('toggles line wrapping on', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS },
			onChange
		});

		await openMenu(screen);
		await screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' }).click();

		expect(onChange).toHaveBeenCalledWith({ wrap: true });
	});

	it('toggles line wrapping back off when already enabled', async () => {
		const onChange = vi.fn();
		const screen = await renderWithTestWrapper(DiffOptionsMenu, {
			options: { ...DEFAULT_DIFF_VIEW_OPTIONS, wrap: true },
			onChange
		});

		await openMenu(screen);
		await screen.getByRole('menuitemcheckbox', { name: 'Wrap lines' }).click();

		expect(onChange).toHaveBeenCalledWith({ wrap: false });
	});
});
