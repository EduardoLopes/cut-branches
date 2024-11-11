import { render } from '@testing-library/svelte';
import { tick } from 'svelte';
import { describe, expect, beforeEach, vi } from 'vitest';
import Footer from '../footer.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { globalStore } from '$lib/stores/global-store.svelte';

vi.useFakeTimers();

describe('Footer Component', () => {
	beforeEach(() => {
		globalStore.lastUpdatedAt = new Date();
	});

	test('updates time every second', async () => {
		const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
		vi.advanceTimersByTime(10000);
		await tick();
		const lastUpdatedAt = getByTestId('last-updated-text');
		expect(lastUpdatedAt).toHaveTextContent('Last updated 10 seconds ago');
	});

	test('displays last updated time', async () => {
		const { getByTestId } = render(TestWrapper, { props: { component: Footer } });
		const lastUpdatedAt = getByTestId('last-updated-text');
		expect(lastUpdatedAt).toHaveTextContent('Last updated now');
	});

	test('does not display last updated time if not available', async () => {
		globalStore.lastUpdatedAt = undefined;
		const { queryByTestId } = render(TestWrapper, { props: { component: Footer } });
		const lastUpdatedAt = queryByTestId('last-updated-text');
		expect(lastUpdatedAt).not.toBeInTheDocument();
	});
});
