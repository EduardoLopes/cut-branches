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
});
