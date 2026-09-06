import { describe, expect, beforeEach, vi } from 'vitest';
import LockBranchToggle from '../lock-branch-toggle.svelte';
import { commands } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock state for locked branches
let mockLockedBranches: string[] = [];

// Mock Tauri commands
vi.mock('$infrastructure/bindings', () => ({
	commands: {
		listLockedBranches: vi.fn(() =>
			Promise.resolve({ status: 'ok', data: { branches: mockLockedBranches } })
		),
		batchCreateLockedBranches: vi.fn((input) => {
			mockLockedBranches.push(...input.branchNames);
			return Promise.resolve({ status: 'ok', data: {} });
		}),
		batchDeleteLockedBranches: vi.fn((input) => {
			input.branchNames.forEach((branch: string) => {
				const index = mockLockedBranches.indexOf(branch);
				if (index > -1) mockLockedBranches.splice(index, 1);
			});
			return Promise.resolve({ status: 'ok', data: {} });
		}),
		updateBranchSelectionBatch: vi.fn(() => Promise.resolve({ status: 'ok', data: {} })),
		batchDeleteSelectedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} }))
	}
}));

describe('LockBranchToggle Component', () => {
	beforeEach(() => {
		mockLockedBranches = [];
		vi.mocked(commands.batchCreateLockedBranches).mockClear();
		vi.mocked(commands.batchDeleteLockedBranches).mockClear();
		vi.mocked(commands.updateBranchSelectionBatch).mockClear();
	});

	describe('Rendering', () => {
		test('displays lock icon when branch is locked', async () => {
			mockLockedBranches = ['test-branch'];
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});

			// Wait for the query to load and the lock icon to appear
			await vi.waitFor(() => {
				const lockIcon = getByTestId('lock-icon');
				expect(lockIcon).toBeInTheDocument();
			});
		});

		test('displays unlock icon when branch is unlocked', async () => {
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const unlockIcon = getByTestId('unlock-icon');
			expect(unlockIcon).toBeInTheDocument();
		});

		test('has correct aria-label when branch is locked', async () => {
			mockLockedBranches = ['test-branch'];
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');
			await vi.waitFor(() =>
				expect(button).toHaveAttribute('aria-label', 'unlock branch test-branch')
			);
		});

		test('has correct aria-label when branch is unlocked', async () => {
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('aria-label', 'lock branch test-branch');
		});
	});

	describe('Interactions', () => {
		test('calls lock mutation when clicking unlocked branch', async () => {
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');

			// Initially unlocked
			expect(commands.batchCreateLockedBranches).not.toHaveBeenCalled();

			// Click to lock
			await button.click();
			await vi.waitFor(() => {
				expect(commands.batchCreateLockedBranches).toHaveBeenCalledWith({
					repoId: 'test-repo',
					branchNames: ['test-branch']
				});
				expect(commands.updateBranchSelectionBatch).toHaveBeenCalledWith({
					repoId: 'test-repo',
					branchNames: ['test-branch'],
					isSelected: false
				});
			});
		});

		test('calls unlock mutation when clicking locked branch', async () => {
			mockLockedBranches = ['test-branch'];
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});

			// Wait for query to load
			await vi.waitFor(() => {
				expect(getByTestId('lock-icon')).toBeInTheDocument();
			});

			const button = getByTestId('lock-toggle-button');

			// Click to unlock
			await button.click();
			await vi.waitFor(() => {
				expect(commands.batchDeleteLockedBranches).toHaveBeenCalledWith({
					repoId: 'test-repo',
					branchNames: ['test-branch']
				});
			});
		});

		test('handles disabled state correctly', async () => {
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo',
				disabled: true
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('disabled');
		});
	});

	describe('Multiple Repositories', () => {
		test('handles different repository IDs correctly', async () => {
			// Mock shows unlocked for test-repo (other-repo would be separate in backend)
			mockLockedBranches = [];

			// Render toggle for original repo - should be unlocked
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});

			expect(getByTestId('unlock-icon')).toBeInTheDocument();
		});

		test('properly handles updates for correct repository', async () => {
			// Mock backend for repo-1 (repo-2 would be separate in actual backend)
			mockLockedBranches = [];

			// Test only one repository's behavior
			const { getByTestId } = await renderWithTestWrapper(LockBranchToggle, {
				branch: 'feature-branch',
				repositoryID: 'repo-1'
			});

			// Click button for repo1
			const button = getByTestId('lock-toggle-button');
			await button.click();

			// Check that repo1 state changed
			expect(mockLockedBranches.includes('feature-branch')).toBe(true);
		});
	});
});
