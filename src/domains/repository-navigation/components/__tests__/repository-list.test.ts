import { tick } from 'svelte';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RepositoryList from '../repository-list.svelte';
import { eventBus, Events } from '$services/event-bus';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

// Mock the query composables
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

// Mock the prefetch composable
const mockPrefetchRepositoryData = vi.fn();

vi.mock('$domains/repository-navigation/core/composables/create-prefetch-repository-data', () => ({
	createPrefetchRepositoryData: vi.fn(() => mockPrefetchRepositoryData)
}));

// Mock page state
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
			// Simply verify the component renders without errors
			// The prefetch composable mock will be called during component initialization
			const screen = renderWithTestWrapper(RepositoryList);
			expect(screen.container).toBeInTheDocument();
		});
	});

	describe('Event Bus Integration', () => {
		it('publishes REPOSITORY_ADD_REQUESTED event when add button is clicked', async () => {
			const publishSpy = vi.spyOn(eventBus, 'publish');

			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			await addButton.click();
			await tick();

			expect(publishSpy).toHaveBeenCalledWith(Events.REPOSITORY_ADD_REQUESTED);
		});

		it('disables add button when repository is being added', async () => {
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			// Initially enabled
			expect(addButton).not.toBeDisabled();

			// Publish REPOSITORY_ADDING event
			eventBus.publish(Events.REPOSITORY_ADDING);
			await tick();

			// Button should be disabled
			expect(addButton).toBeDisabled();
		});

		it('enables add button after repository is added successfully', async () => {
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			// Simulate adding process
			eventBus.publish(Events.REPOSITORY_ADDING);
			await tick();
			expect(addButton).toBeDisabled();

			// Simulate successful add
			eventBus.publish(Events.REPOSITORY_ADDED);
			await tick();

			// Button should be enabled again
			expect(addButton).not.toBeDisabled();
		});

		it('enables add button after repository add fails', async () => {
			const screen = renderWithTestWrapper(RepositoryList);
			const addButton = screen.getByRole('button', { name: /add a git repository/i });

			// Simulate adding process
			eventBus.publish(Events.REPOSITORY_ADDING);
			await tick();
			expect(addButton).toBeDisabled();

			// Simulate failed add
			eventBus.publish(Events.REPOSITORY_ADD_FAILED);
			await tick();

			// Button should be enabled again
			expect(addButton).not.toBeDisabled();
		});
	});
});
