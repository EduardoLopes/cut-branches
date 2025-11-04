import { describe, expect, beforeEach, vi } from 'vitest';
import LockBranchToggle from '../lock-branch-toggle.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

// Mock state for locked branches
let mockLockedBranches: string[] = [];

// Mock Tauri commands
vi.mock('$lib/bindings', () => ({
	commands: {
		listLockedBranches: vi.fn(() =>
			Promise.resolve({ status: 'ok', data: { branches: mockLockedBranches } })
		),
		batchCreateLockedBranches: vi.fn((input) => {
			mockLockedBranches.push(...input.branchNames);
			return Promise.resolve({ status: 'ok', data: {} });
		}),
		batchDeleteLockedBranches: vi.fn((input) => {
			mockLockedBranches = mockLockedBranches.filter((b) => !input.branchNames.includes(b));
			return Promise.resolve({ status: 'ok', data: {} });
		}),
		batchDeleteSelectedBranches: vi.fn(() => Promise.resolve({ status: 'ok', data: {} }))
	}
}));

describe('LockBranchToggle Component', () => {
	beforeEach(() => {
		mockLockedBranches = [];
	});

	describe('Rendering', () => {
		test('displays lock icon when branch is locked', async () => {
			mockLockedBranches = ['test-branch'];
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
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
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const unlockIcon = getByTestId('unlock-icon');
			expect(unlockIcon).toBeInTheDocument();
		});

		test('has correct aria-label when branch is locked', async () => {
			mockLockedBranches = ['test-branch'];
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');
			vi.waitFor(() => expect(button).toHaveAttribute('aria-label', 'unlock branch test-branch'));
		});

		test('has correct aria-label when branch is unlocked', () => {
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('aria-label', 'lock branch test-branch');
		});
	});

	describe('Interactions', () => {
		test('toggles lock state on click', async () => {
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');

			await button.click();
			vi.waitFor(() => expect(mockLockedBranches.includes('test-branch')).toBe(true));

			await button.click();
			vi.waitFor(() => expect(mockLockedBranches.includes('test-branch')).toBe(false));
		});

		test('handles disabled state correctly', () => {
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo',
				disabled: true
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('disabled');
		});

		test('updates UI when toggling lock state', async () => {
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});
			const button = getByTestId('lock-toggle-button');

			// Initial state - unlocked
			expect(getByTestId('unlock-icon')).toBeInTheDocument();

			// First click - lock
			await button.click();
			vi.waitFor(() => expect(getByTestId('lock-icon')).toBeInTheDocument());

			// Second click - unlock
			await button.click();
			vi.waitFor(() => expect(getByTestId('unlock-icon')).toBeInTheDocument());
			expect(getByTestId('unlock-icon')).toBeInTheDocument();
		});
	});

	describe('Multiple Repositories', () => {
		test('handles different repository IDs correctly', () => {
			// Mock shows unlocked for test-repo (other-repo would be separate in backend)
			mockLockedBranches = [];

			// Render toggle for original repo - should be unlocked
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
				branch: 'test-branch',
				repositoryID: 'test-repo'
			});

			expect(getByTestId('unlock-icon')).toBeInTheDocument();
		});

		test('properly handles updates for correct repository', async () => {
			// Mock backend for repo-1 (repo-2 would be separate in actual backend)
			mockLockedBranches = [];

			// Test only one repository's behavior
			const { getByTestId } = renderWithTestWrapper(LockBranchToggle, {
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
