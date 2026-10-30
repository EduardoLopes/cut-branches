import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Branch } from '../../core/models/branch';
import RestoreDeletedBranchModal from '../restore-deleted-branch-modal.svelte';
import type { Branch as BranchData } from '$infrastructure/bindings';
import { renderWithTestWrapper } from '$utils/test-utils';

// State machine end-to-end is covered in use-restore-flow.test.ts.
// This file only verifies the modal's wiring: query plumbing, prop binding,
// and the trigger button's enabled/disabled state.

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn().mockResolvedValue(() => {})
}));

const validSha = 'abc1234567890abc1234567890abc1234567890a';

function makeBranchData(name: string): BranchData {
	return {
		name,
		current: false,
		upstream: null,
		lastCommit: {
			sha: validSha,
			shortSha: validSha.slice(0, 7),
			date: '2024-01-01',
			message: 'm',
			summary: 'm',
			author: 'a',
			email: 'a@example.com'
		},
		fullyMerged: false,
		deletedAt: '2024-02-01',
		isReachable: null,
		isSelected: true,
		isLocked: false
	};
}

let selectedBranches: Branch[] = [];
// When true the selection query behaves as still-loading (`data` undefined).

vi.mock(
	'$domains/branch-management/infrastructure/mutations/create-restore-deleted-branch-mutation',
	() => ({
		createRestoreDeletedBranchMutation: () => ({ mutate: vi.fn() }),
		createRestoreDeletedBranchesMutation: () => ({ mutate: vi.fn() })
	})
);

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: () => ({
		data: [
			{
				id: 'r1',
				name: 'my-repo',
				path: '/p',
				currentBranch: 'main',
				branchesCount: 1
			}
		]
	})
}));

vi.mock('$domains/branch-management/infrastructure/queries/create-get-branches-query', () => ({
	createGetBranchesQuery: (input: () => { filters?: { selectionStatus?: string } }) => ({
		get data() {
			const filters = input().filters || {};
			if (filters.selectionStatus === 'selected') {
				return { branches: selectedBranches };
			}
			return { branches: [] };
		},
		isLoading: false,
		isError: false,
		error: null
	})
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: vi.fn() }
}));

beforeEach(() => {
	selectedBranches = [Branch.fromData(makeBranchData('feat-a'))];
});

describe('RestoreDeletedBranchModal', () => {
	test('stays closed, with no branch cards built, until something opens it', async () => {
		const screen = await renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });

		const dialog = screen.getByTestId('restore-branch-dialog').element() as HTMLDialogElement;
		expect(dialog.open).toBe(false);
		expect(screen.getByTestId('restore-branch-list')).not.toMatchTextContent('feat-a');
	});

	test('lists the selected branches and disables Restore once the run starts', async () => {
		const screen = await renderWithTestWrapper(RestoreDeletedBranchModal, {
			repoId: 'r1',
			open: true
		});

		await vi.waitFor(() =>
			expect(screen.getByTestId('restore-branch-list')).toMatchTextContent('feat-a')
		);
		const restore = screen.getByTestId('restore-button');
		expect(restore).not.toBeDisabled();

		// The mocked mutation never reports back, so the flow stays in flight.
		await restore.click();
		await vi.waitFor(() => expect(restore).toBeDisabled());
		expect(screen.getByTestId('cancel-button')).toBeDisabled();
	});
});
