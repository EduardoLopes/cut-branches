import { render, fireEvent } from '@testing-library/svelte';
import BranchesBulkActions from '../branches-bulk-actions.svelte';
import TestWrapper, { testWrapperWithProps } from '../test-wrapper.svelte';
import type { Repository } from '$lib/stores/repositories.svelte';

const mockRepo: Repository = {
	name: 'test-repo',
	currentBranch: 'main',
	path: '/path/to/repo',
	branchesCount: 3,
	id: '1',
	branches: [
		{
			name: 'main',
			current: true,
			last_commit: {
				hash: 'abc123',
				date: '2023-01-01',
				message: 'Initial commit',
				author: 'John Doe',
				email: 'john@example.com'
			},
			fully_merged: false
		},
		{
			name: 'feature-1',
			current: false,
			last_commit: {
				hash: 'def456',
				date: '2023-01-02',
				message: 'Add feature 1',
				author: 'Jane Doe',
				email: 'jane@example.com'
			},
			fully_merged: false
		},
		{
			name: 'feature-2',
			current: false,
			last_commit: {
				hash: 'ghi789',
				date: '2023-01-03',
				message: 'Add feature 2',
				author: 'Jim Doe',
				email: 'jim@example.com'
			},
			fully_merged: false
		}
	]
};

describe('BranchesBulkActions Component', () => {
	test('renders search input', () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, {
				currentRepo: mockRepo,
				selectibleCount: 2,
				selectedSearchLength: 0,
				branches: mockRepo.branches,
				onSearch: vi.fn(),
				onClearSearch: vi.fn()
			})
		});
		expect(getByTestId('search-input')).toBeInTheDocument();
	});

	test('selects all branches when select all checkbox is clicked', async () => {
		const props = {
			currentRepo: mockRepo,
			selectibleCount: 2,
			selectedSearchLength: 0,
			branches: mockRepo.branches,
			onSearch: vi.fn(),
			onClearSearch: vi.fn()
		};

		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, props)
		});
		const checkbox = getByTestId('select-all-checkbox');
		await fireEvent.click(checkbox);

		expect(getByTestId('selectible-count-info')).toHaveTextContent(
			`${props.selectibleCount} / ${props.selectibleCount} branches`
		);
	});

	test('calls onSearch when input changes', async () => {
		const onSearch = vi.fn();
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, {
				currentRepo: mockRepo,
				selectibleCount: 2,

				selectedSearchLength: 0,
				branches: mockRepo.branches,
				onSearch,
				onClearSearch: vi.fn()
			})
		});
		const input = getByTestId('search-input');
		await fireEvent.input(input, { target: { value: 'feature' } });
		expect(onSearch).toHaveBeenCalledWith('feature');
	});

	test('calls onClearSearch when clear button is clicked', async () => {
		const onClearSearch = vi.fn();
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, {
				currentRepo: mockRepo,
				selectibleCount: 2,

				selectedSearchLength: 0,
				branches: mockRepo.branches,
				onSearch: vi.fn(),
				onClearSearch
			})
		});
		const button = getByTestId('clear-search-button');
		await fireEvent.click(button);
		expect(onClearSearch).toHaveBeenCalled();
	});

	test('selects all branches when select all checkbox is clicked', async () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, {
				currentRepo: mockRepo,
				selectibleCount: 2,
				selectedSearchLength: 0,
				branches: mockRepo.branches,
				onSearch: vi.fn(),
				onClearSearch: vi.fn()
			})
		});
		const checkbox = getByTestId('select-all-checkbox');
		await fireEvent.click(checkbox);
		expect(checkbox).toBeChecked();
	});

	test('renders correctly when selectibleCount is 1 and there is a search query', () => {
		const { getByTestId } = render(TestWrapper, {
			props: testWrapperWithProps(BranchesBulkActions, {
				currentRepo: mockRepo,
				selectibleCount: 1,
				selectedSearchLength: 1,
				branches: mockRepo.branches,
				onSearch: vi.fn(),
				onClearSearch: vi.fn()
			})
		});
		expect(getByTestId('search-query-info')).toBeInTheDocument();
	});
});
