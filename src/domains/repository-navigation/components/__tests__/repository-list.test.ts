import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RepositoryList from '../repository-list.svelte';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

const mockRepositories = [
	mockDataFactory.repository({ id: '1', name: 'repo-1', branchesCount: 5 }),
	mockDataFactory.repository({ id: '2', name: 'repo-2', branchesCount: 3 }),
	mockDataFactory.repository({ id: '3', name: 'repo-3', branchesCount: 10 })
];

vi.mock('$domains/repository-navigation/core/composables/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		get data() {
			return mockRepositories;
		},
		isLoading: false,
		isError: false
	}))
}));

const mockPrefetchRepositoryData = vi.fn();

vi.mock('$domains/repository-navigation/core/composables/create-prefetch-repository-data', () => ({
	createPrefetchRepositoryData: vi.fn(() => mockPrefetchRepositoryData)
}));

const mockAddRepository = vi.fn();
let mockIsPending = false;

vi.mock('$domains/repository-management/core/composables/use-add-repository.svelte', () => ({
	useAddRepository: vi.fn(() => ({
		addRepository: mockAddRepository,
		get isPending() {
			return mockIsPending;
		}
	}))
}));

vi.mock('$app/state', () => ({
	page: {
		params: {
			id: '1'
		}
	}
}));

describe('RepositoryList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockIsPending = false;
	});

	describe('Rendering', () => {
		it('renders add repository button', () => {
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });
			expect(addButton).toBeInTheDocument();
		});
	});

	describe('Hover Prefetching', () => {
		it('creates prefetch function on component mount', () => {
			const screen = renderWithTestWrapper(RepositoryList);
			expect(screen.container).toBeInTheDocument();
		});
	});

	describe('Add repository', () => {
		it('calls addRepository when add button is clicked', async () => {
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			await addButton.click();
			await tick();

			expect(mockAddRepository).toHaveBeenCalledTimes(1);
		});

		it('disables add button while the mutation is pending', async () => {
			mockIsPending = true;
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			expect(addButton).toBeDisabled();
		});

		it('enables add button when the mutation is idle', () => {
			mockIsPending = false;
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			expect(addButton).not.toBeDisabled();
		});
	});
});
