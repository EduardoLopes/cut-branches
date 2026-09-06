import { describe, expect, vi, beforeEach } from 'vitest';
import RemoveRepositoryModal from '../remove-repository-modal.svelte';
import { goto } from '$app/navigation';
import type { AppError, DeleteRepositoryOutput } from '$infrastructure/bindings';
import type { Result } from '$infrastructure/tauri-commands';
import type { Repository } from '$types/repository';
import { renderWithTestWrapper } from '$utils/test-utils';

const mockRepository: Repository = {
	name: 'test-repo',
	path: '/path/to/test-repo',
	branches: [],
	currentBranch: 'main',
	branchesCount: 0,
	id: '1'
};

const mockRepository2: Repository = {
	name: 'test-repo-2',
	path: '/path/to/test-repo-2',
	branches: [],
	currentBranch: 'main',
	branchesCount: 0,
	id: '2'
};

// Mock repositories state
let mockRepositories: Repository[] = [mockRepository, mockRepository2];

// Mock Tauri commands
vi.mock('$infrastructure/bindings', () => ({
	commands: {
		listRepositories: vi
			.fn()
			.mockImplementation(() => Promise.resolve({ status: 'ok', data: mockRepositories })),
		getRepository: vi.fn().mockImplementation((input) => {
			const repo = mockRepositories.find((r) => r.id === input.id || r.path === input.path);
			if (repo) {
				return Promise.resolve({ status: 'ok', data: repo });
			}
			return Promise.resolve({ status: 'error', error: { kind: 'NotFound' } });
		}),
		deleteRepository: vi.fn().mockImplementation((input) => {
			const indexToRemove = mockRepositories.findIndex((r) => r.id === input.id);
			if (indexToRemove !== -1) {
				mockRepositories.splice(indexToRemove, 1);
			}
			return Promise.resolve({ status: 'ok', data: { success: true } });
		}),
		deleteAllLockedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} })),
		deleteAllSelectedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} }))
	}
}));

vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

describe('RemoveRepositoryModal', () => {
	beforeEach(() => {
		// Reset mock repositories state
		mockRepositories = [mockRepository, mockRepository2];
		// Reset mocks between tests
		vi.clearAllMocks();
	});

	describe('Modal Rendering', () => {
		test('renders with correct initial state', async () => {
			const { getByText } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id
			});

			expect(getByText('Remove repository')).toBeInTheDocument();
		});

		test('renders repository name in modal content when open', async () => {
			const { getByText } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			// The name is filled in once the getRepository query resolves.
			await vi.waitFor(() => {
				expect(getByText(/Are you sure you want to remove/)).toMatchTextContent(
					mockRepository.name
				);
			});
		});
	});

	describe('Modal Interaction', () => {
		test('should close the modal on cancel', async () => {
			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			// Modal is portaled to document.body, so we need to query the document
			const modal = document.querySelector('[data-testid="remove-modal"]') as HTMLElement | null;
			expect(modal).toBeInTheDocument();

			const cancelButton = getByTestId('cancel-remove');
			await cancelButton.click();

			await expect.element(modal).not.toHaveAttribute('open');
		});

		test('closes modal after repository removal', async () => {
			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			const removeButton = getByTestId('confirm-remove');
			await removeButton.click();

			// Modal is portaled to document.body, so we need to query the document
			const modal = document.querySelector('[data-testid="remove-modal"]') as HTMLElement | null;
			await expect.element(modal).not.toHaveAttribute('open');
		});
	});

	describe('Repository Removal', () => {
		test('should remove the repository from database', async () => {
			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			const removeButton = getByTestId('confirm-remove');
			await removeButton.click();

			await vi.waitFor(() => {
				expect(mockRepositories.find((r) => r.id === mockRepository.id)).toBeUndefined();
			});
		});

		test('shows notification after repository removal', async () => {
			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			const removeButton = getByTestId('confirm-remove');
			await removeButton.click();

			// Notification is shown via mutation meta, which is tested in providers.test.ts
			// Here we just verify the mutation completes
			await vi.waitFor(() => {
				expect(mockRepositories.find((r) => r.id === mockRepository.id)).toBeUndefined();
			});
		});
	});

	describe('Navigation', () => {
		test('should navigate after repository removal', async () => {
			// Set up only the test repository (single repo scenario)
			mockRepositories = [mockRepository];

			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			const removeButton = getByTestId('confirm-remove');
			await removeButton.click();

			// Should navigate away after deletion
			await vi.waitFor(() => expect(goto).toHaveBeenCalled());
		});

		test('should navigate to the repos index when no repositories remain', async () => {
			// Set up only the test repository
			mockRepositories = [mockRepository];

			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			const removeButton = getByTestId('confirm-remove');
			await removeButton.click();

			await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/repos'));
		});
	});
	describe('Pending and failed removals', () => {
		test('keeps the dialog open while the removal is in flight', async () => {
			let settle: (value: Result<DeleteRepositoryOutput, AppError>) => void = () => {};
			const { commands } = await import('$infrastructure/bindings');
			vi.mocked(commands.deleteRepository).mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						settle = resolve;
					})
			);

			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			await getByTestId('confirm-remove').click();

			// Still up, still on the repository's route: the user is not stranded.
			const modal = document.querySelector('[data-testid="remove-modal"]') as HTMLElement | null;
			expect(modal).toHaveAttribute('open');
			expect(goto).not.toHaveBeenCalled();

			// And the button is disabled while it is in flight, so there is no second
			// remove to fire.
			await vi.waitFor(() => expect(getByTestId('confirm-remove')).toBeDisabled());
			expect(getByTestId('cancel-remove')).toBeDisabled();
			expect(commands.deleteRepository).toHaveBeenCalledTimes(1);

			settle({ status: 'ok', data: { success: true } });
			await expect.element(modal).not.toHaveAttribute('open');
		});

		test('navigates away when the repository is already gone', async () => {
			const { commands } = await import('$infrastructure/bindings');
			vi.mocked(commands.deleteRepository).mockResolvedValueOnce({
				status: 'error',
				error: { kind: 'repository_not_found', message: 'gone', description: null }
			});

			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			await getByTestId('confirm-remove').click();

			// The row is gone either way, so the dead route is left exactly as it
			// would be after a successful removal.
			await vi.waitFor(() => expect(goto).toHaveBeenCalled());

			const modal = document.querySelector('[data-testid="remove-modal"]') as HTMLElement | null;
			await expect.element(modal).not.toHaveAttribute('open');
		});

		test('stays on the route when the removal fails for another reason', async () => {
			const { commands } = await import('$infrastructure/bindings');
			vi.mocked(commands.deleteRepository).mockResolvedValueOnce({
				status: 'error',
				error: { kind: 'database_error', message: 'locked', description: null }
			});

			const { getByTestId } = await renderWithTestWrapper(RemoveRepositoryModal, {
				repositoryId: mockRepository.id,
				open: true
			});

			await getByTestId('confirm-remove').click();

			const modal = document.querySelector('[data-testid="remove-modal"]') as HTMLElement | null;
			await expect.element(modal).not.toHaveAttribute('open');
			// The repository (and its route) is still there — nothing to navigate to.
			expect(goto).not.toHaveBeenCalled();
		});
	});
});
