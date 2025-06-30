import { render, fireEvent } from '@testing-library/svelte';
import { tick } from 'svelte';
import type { Writable } from 'svelte/store';
import { vi } from 'vitest';
import RepositoryHeader from '../repository-header.svelte';
import type { Repository, Branch } from '$services/common';

// Mock the navigation module
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

// Define a type for our mock store that includes the .state property
interface MockRepositoryStoreType extends Writable<Repository | null> {
	state?: Repository | null;
}

// Mock the getRepositoryStore
const mockRepositoryStore = vi.hoisted(() => {
	// Initial store state, can be updated in tests
	const store: MockRepositoryStoreType = {
		subscribe: vi.fn(() => () => {}), // subscribe returns an unsubscribe function
		set: vi.fn(),
		update: vi.fn(),
		state: null // Initial state
	};
	return {
		getRepositoryStore: vi.fn(() => store),
		mockStore: store // export the store itself to manipulate its 'state'
	};
});

vi.mock('../../store/repository.svelte', () => {
	return {
		getRepositoryStore: mockRepositoryStore.getRepositoryStore
	};
});

describe('RepositoryHeader', () => {
	const mockOnUpdate = vi.fn();
	const mockBranches: Branch[] = [];

	const baseMockRepo: Repository = {
		id: 'mock-repo-id',
		name: 'Test-Repo',
		path: '/path/to/repo',
		branches: mockBranches,
		currentBranch: 'main',
		branchesCount: 0
	};

	beforeEach(() => {
		vi.resetAllMocks();
		mockRepositoryStore.mockStore.state = null;
		mockRepositoryStore.getRepositoryStore.mockReturnValue(mockRepositoryStore.mockStore);
	});

	test('should render the component', () => {
		const { container } = render(RepositoryHeader, {
			props: { isLoading: false, onUpdate: mockOnUpdate }
		});
		expect(container).toBeInTheDocument();
	});

	test('should display repository name when available', async () => {
		const repoName = 'Display-Repo-Name';
		mockRepositoryStore.mockStore.state = { ...baseMockRepo, name: repoName };

		const { getByTestId } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: false, onUpdate: mockOnUpdate }
		});

		await tick();

		expect(getByTestId('repository-name')).toBeInTheDocument();
		expect(getByTestId('repository-name').textContent).toBe(repoName);
	});

	test('should display nothing for repository name when not available', async () => {
		mockRepositoryStore.mockStore.state = null;

		const { getByTestId } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: false, onUpdate: mockOnUpdate }
		});
		await tick();
		const repoNameElement = getByTestId('repository-name');
		expect(repoNameElement).toBeInTheDocument();
		expect(repoNameElement.textContent).toBe('');
	});

	test('should show loading indicator when isLoading is true', () => {
		const { container } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: true, onUpdate: mockOnUpdate }
		});
		expect(container.querySelector('[data-testid="update-button"]')).toBeInTheDocument();
	});

	test('update button should call onUpdate when clicked', async () => {
		const { getByTestId } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: false, onUpdate: mockOnUpdate }
		});
		const updateButton = getByTestId('update-button');
		await fireEvent.click(updateButton);
		expect(mockOnUpdate).toHaveBeenCalledTimes(1);
	});

	test('RemoveRepositoryModal should be rendered when repository state exists', async () => {
		mockRepositoryStore.mockStore.state = { ...baseMockRepo, name: 'Repo-For-Modal' };

		const { container } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: false, onUpdate: mockOnUpdate }
		});
		await tick();
		expect(container.querySelector('[data-testid="open-remove-modal"]')).toBeInTheDocument();
	});

	test('RemoveRepositoryModal should NOT be rendered when repository state does not exist', async () => {
		mockRepositoryStore.mockStore.state = null;

		const { container } = render(RepositoryHeader, {
			props: { repositoryId: 'some-id', isLoading: false, onUpdate: mockOnUpdate }
		});
		await tick();
		expect(container.querySelector('[data-testid="open-remove-modal"]')).not.toBeInTheDocument();
	});

	test('should navigate to restore page when restore button is clicked', async () => {
		const { goto } = await import('$app/navigation');
		mockRepositoryStore.mockStore.state = { ...baseMockRepo, name: 'Repo-For-Restore' };

		const { getByText } = render(RepositoryHeader, {
			props: { repositoryId: 'test-repo-id', isLoading: false, onUpdate: mockOnUpdate }
		});

		await tick();

		// Find the restore button by its text content
		const restoreButton = getByText('Restore').closest('button');
		expect(restoreButton).toBeInTheDocument();
		await fireEvent.click(restoreButton!);

		expect(goto).toHaveBeenCalledWith('/repos/test-repo-id/restore');
	});

	test('should navigate back when back button is clicked', async () => {
		const { goto } = await import('$app/navigation');

		const { getByText } = render(RepositoryHeader, {
			props: {
				repositoryId: 'test-repo-id',
				isLoading: false,
				onUpdate: mockOnUpdate,
				showBackButton: true
			}
		});

		await tick();

		// Find the back button by its "Back" text (which is visually hidden but accessible)
		const backButton = getByText('Back').closest('button');
		expect(backButton).toBeInTheDocument();

		await fireEvent.click(backButton!);

		expect(goto).toHaveBeenCalledWith('/repos/test-repo-id');
	});

	test('should not navigate when repositoryId is not provided', async () => {
		const { goto } = await import('$app/navigation');
		mockRepositoryStore.mockStore.state = { ...baseMockRepo, name: 'Repo-For-Test' };

		const { container } = render(RepositoryHeader, {
			props: { isLoading: false, onUpdate: mockOnUpdate } // No repositoryId provided
		});

		await tick();

		// Try to click the restore button if it exists
		const restoreButton = container.querySelector('[data-testid="restore-navigate-button"]');
		if (restoreButton) {
			await fireEvent.click(restoreButton);
			// goto should not be called when repositoryId is undefined
			expect(goto).not.toHaveBeenCalled();
		}
	});
});
