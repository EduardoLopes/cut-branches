import { tick } from 'svelte';
import { describe, expect, beforeEach, vi } from 'vitest';
import Footer from '../footer.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

vi.useFakeTimers();

vi.mock('@tanstack/svelte-query-devtools', () => ({
	SvelteQueryDevtools: vi.fn().mockImplementation(() => ({
		$$: { capture: () => {}, on: () => {}, render: () => {} },
		$destroy: () => {},
		$set: () => {}
	}))
}));

vi.mock('$app/state', () => ({
	page: {
		params: { id: 'repo-1' }
	}
}));

let mockedLastSyncedAt: string | null = null;

vi.mock('$infrastructure/queries/create-get-repository-query', () => ({
	createGetRepositoryQuery: () => ({
		get data() {
			return mockedLastSyncedAt
				? { id: 'repo-1', name: 'r', lastSyncedAt: mockedLastSyncedAt }
				: undefined;
		},
		isLoading: false,
		isError: false
	})
}));

describe('Footer Component', () => {
	describe('Time Display', () => {
		const fixedDate = new Date('2023-01-01T12:00:00Z');

		beforeEach(() => {
			vi.setSystemTime(fixedDate);
			// Rust serializes NaiveDateTime without a timezone; the footer
			// appends Z to interpret as UTC.
			mockedLastSyncedAt = '2023-01-01T12:00:00';
		});

		test('displays "now" when just synced', () => {
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
			vi.advanceTimersByTime(120000);
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 minutes ago');
		});

		test('displays hours when more than 60 minutes have passed', async () => {
			const { getByTestId } = renderWithTestWrapper(Footer);
			vi.advanceTimersByTime(7200000);
			await tick();
			const lastUpdatedAt = getByTestId('last-updated-text');
			expect(lastUpdatedAt).toHaveTextContent('Last updated 2 hours ago');
		});
	});

	describe('UI State', () => {
		test('does not display last updated time when the repo has no lastSyncedAt', () => {
			mockedLastSyncedAt = null;
			const { container } = renderWithTestWrapper(Footer);
			const lastUpdatedAt = container.querySelector('[data-testid="last-updated-text"]');
			expect(lastUpdatedAt).not.toBeInTheDocument();
		});
	});
});
