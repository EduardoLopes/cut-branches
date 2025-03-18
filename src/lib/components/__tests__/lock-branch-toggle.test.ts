import { render, fireEvent } from '@testing-library/svelte';
import { describe, expect, beforeEach } from 'vitest';
import LockBranchToggle from '../lock-branch-toggle.svelte';
import TestWrapper from '../test-wrapper.svelte';
import { getLockedBranchesStore } from '$lib/stores/locked-branches.svelte';
import type { SetStore } from '$lib/utils/set-store.svelte';

describe('LockBranchToggle Component', () => {
	let lockedBranchesStore: SetStore<string> | undefined;

	beforeEach(() => {
		lockedBranchesStore = getLockedBranchesStore('test-repo');
		lockedBranchesStore?.clear();
	});

	describe('Rendering', () => {
		test('displays lock icon when branch is locked', async () => {
			lockedBranchesStore?.add(['test-branch']);
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const lockIcon = getByTestId('lock-icon');
			expect(lockIcon).toBeInTheDocument();
		});

		test('displays unlock icon when branch is unlocked', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const unlockIcon = getByTestId('unlock-icon');
			expect(unlockIcon).toBeInTheDocument();
		});

		test('has correct aria-label when branch is locked', () => {
			lockedBranchesStore?.add(['test-branch']);
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('aria-label', 'Unlock branch');
		});

		test('has correct aria-label when branch is unlocked', () => {
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('aria-label', 'Lock branch');
		});
	});

	describe('Interactions', () => {
		test('toggles lock state on click', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const button = getByTestId('lock-toggle-button');

			await fireEvent.click(button);
			expect(lockedBranchesStore?.has('test-branch')).toBe(true);

			await fireEvent.click(button);
			expect(lockedBranchesStore?.has('test-branch')).toBe(false);
		});

		test('handles disabled state correctly', () => {
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo', disabled: true }
				}
			});
			const button = getByTestId('lock-toggle-button');
			expect(button).toHaveAttribute('disabled');
		});

		test('updates UI when toggling lock state', async () => {
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});
			const button = getByTestId('lock-toggle-button');

			// Initial state - unlocked
			expect(getByTestId('unlock-icon')).toBeInTheDocument();

			// First click - lock
			await fireEvent.click(button);
			expect(getByTestId('lock-icon')).toBeInTheDocument();

			// Second click - unlock
			await fireEvent.click(button);
			expect(getByTestId('unlock-icon')).toBeInTheDocument();
		});
	});

	describe('Multiple Repositories', () => {
		test('handles different repository IDs correctly', () => {
			// Set up another repo store and add branch to it
			const otherRepoStore = getLockedBranchesStore('other-repo');
			otherRepoStore?.add(['test-branch']);

			// Render toggle for original repo - should still be unlocked
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'test-branch', repositoryID: 'test-repo' }
				}
			});

			expect(getByTestId('unlock-icon')).toBeInTheDocument();
		});

		test('properly handles store updates for correct repository', async () => {
			// Set up two separate repository stores
			const repo1Store = getLockedBranchesStore('repo-1');
			const repo2Store = getLockedBranchesStore('repo-2');

			// Cleanup
			repo1Store?.clear();
			repo2Store?.clear();

			// Test only one repository's behavior
			const { getByTestId } = render(TestWrapper, {
				props: {
					component: LockBranchToggle,
					props: { branch: 'feature-branch', repositoryID: 'repo-1' }
				}
			});

			// Click button for repo1
			const button = getByTestId('lock-toggle-button');
			await fireEvent.click(button);

			// Check that only repo1 state changed
			expect(repo1Store?.has('feature-branch')).toBe(true);
			expect(repo2Store?.has('feature-branch')).toBe(false);
		});
	});
});
