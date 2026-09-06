import { describe, expect, test, vi } from 'vitest';
import ListFilter from '../list-filter.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

describe('ListFilter', () => {
	test('renders a search input with the placeholder as its label by default', async () => {
		const screen = await renderWithTestWrapper(ListFilter, {});

		const input = screen.getByPlaceholder('Filter');
		expect(input).toBeInTheDocument();
		expect(input.element().getAttribute('aria-label')).toBe('Filter');
		expect(screen.getByTestId('list-filter')).toBeInTheDocument();
	});

	test('takes a custom placeholder, label and test id', async () => {
		const screen = await renderWithTestWrapper(ListFilter, {
			placeholder: 'Filter results',
			ariaLabel: 'Filter the results',
			testId: 'scan-search'
		});

		const input = screen.getByPlaceholder('Filter results');
		expect(input.element().getAttribute('aria-label')).toBe('Filter the results');
		expect(screen.getByTestId('scan-search')).toBeInTheDocument();
	});

	test('shows the match count only while a query is active and both counts exist', async () => {
		const screen = await renderWithTestWrapper(ListFilter, {
			matchCount: 3,
			total: 12,
			testId: 'filter'
		});

		expect(screen.getByTestId('filter-count').elements()).toHaveLength(0);

		await screen.getByPlaceholder('Filter').fill('cut');
		await vi.waitFor(() => expect(screen.getByTestId('filter-count')).toHaveTextContent('3 of 12'));

		// Whitespace is not a query.
		await screen.getByPlaceholder('Filter').fill('   ');
		await vi.waitFor(() => expect(screen.getByTestId('filter-count').elements()).toHaveLength(0));
	});

	test('never shows a count without both numbers', async () => {
		const onlyMatches = await renderWithTestWrapper(ListFilter, {
			matchCount: 3,
			placeholder: 'Only matches',
			testId: 'a'
		});
		await onlyMatches.getByPlaceholder('Only matches').fill('x');
		expect(onlyMatches.getByTestId('a-count').elements()).toHaveLength(0);

		const onlyTotal = await renderWithTestWrapper(ListFilter, {
			total: 3,
			placeholder: 'Only total',
			testId: 'b'
		});
		await onlyTotal.getByPlaceholder('Only total').fill('x');
		expect(onlyTotal.getByTestId('b-count').elements()).toHaveLength(0);
	});
});
