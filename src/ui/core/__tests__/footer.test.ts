import { tick } from 'svelte';
import { describe, expect, beforeEach, vi } from 'vitest';
import { globalStore } from '../../../store/global-store.svelte';
import Footer from '../footer.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.useFakeTimers();

vi.mock('@tanstack/svelte-query-devtools', () => ({
	SvelteQueryDevtools: vi.fn().mockImplementation(() => ({
		$$: {
			capture: () => {},
			on: () => {},
			render: () => {}
		},
		$destroy: () => {},
		$set: () => {}
	}))
}));

describe('Footer Component', () => {
	describe('Time Display', () => {
		const fixedDate = new Date('2023-01-01T12:00:00Z');

		beforeEach(() => {
			// Use a fixed date for consistent test results
			vi.setSystemTime(fixedDate);
			globalStore.lastUpdatedAt = new Date(fixedDate);
		});

		test('displays "now" when just updated', async () => {
			const { getByTestId } = renderWithTestWrapper(Footer);
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated now');
		});

		test('updates time display every second', async () => {
			const { getByTestId } = renderWithTestWrapper(Footer);
			vi.advanceTimersByTime(10000);
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 10 seconds ago');
		});

		test('displays minutes when more than 60 seconds have passed', async () => {
			const { getByTestId } = renderWithTestWrapper(Footer);
			vi.advanceTimersByTime(120000); // 2 minutes
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 minutes ago');
		});

		test('displays hours when more than 60 minutes have passed', async () => {
			const { getByTestId } = renderWithTestWrapper(Footer);
			vi.advanceTimersByTime(7200000); // 2 hours
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 hours ago');
		});
	});

	describe('UI State', () => {
		test('does not display last updated time if not available', async () => {
			globalStore.lastUpdatedAt = undefined;
			const { container } = renderWithTestWrapper(Footer);
			const lastUpdatedAt = container.querySelector('[data-testid="last-updated-text"]');
			expect(lastUpdatedAt).not.toBeInTheDocument();
		});
	});
});
