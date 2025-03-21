import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, beforeEach, vi } from 'vitest';
import Footer from '../footer.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { globalStore } from '$lib/stores/global-store.svelte';

vi.useFakeTimers();

describe('Footer Component', () => {
	describe('Time Display', () => {
		const fixedDate = new Date('2023-01-01T12:00:00Z');

		beforeEach(() => {
			// Use a fixed date for consistent test results
			vi.setSystemTime(fixedDate);
			globalStore.lastUpdatedAt = new Date(fixedDate);
		});

		test('displays "now" when just updated', async () => {
			const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated now');
		});

		test('updates time display every second', async () => {
			const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
			vi.advanceTimersByTime(10000);
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 10 seconds ago');
		});

		test('displays minutes when more than 60 seconds have passed', async () => {
			const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
			vi.advanceTimersByTime(120000); // 2 minutes
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 minutes ago');
		});

		test('displays hours when more than 60 minutes have passed', async () => {
			const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
			vi.advanceTimersByTime(7200000); // 2 hours
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 hours ago');
		});
	});

	describe('UI State', () => {
		test('does not display last updated time if not available', async () => {
			globalStore.lastUpdatedAt = undefined;
			const { queryByTestId } = render(TestWrapper, { props: { component: Footer } });
			const lastUpdatedAt = queryByTestId('last-updated-text');
			expect(lastUpdatedAt).not.toBeInTheDocument();
		});
	});
});
