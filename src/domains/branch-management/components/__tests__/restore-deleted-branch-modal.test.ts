import { describe, test, expect, vi, beforeEach } from 'vitest';
import { Branch } from '../../core/models/branch';
import RestoreDeletedBranchModal from '../restore-deleted-branch-modal.svelte';
import type { Branch as BranchData } from '$lib/bindings';
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
		lastCommit: {
			sha: validSha,
			shortSha: validSha.slice(0, 7),
			date: '2024-01-01',
			message: 'm',
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

vi.mock('../../core/composables/create-restore-deleted-branch-mutation', () => ({
	createRestoreDeletedBranchMutation: () => ({ mutate: vi.fn() }),
	createRestoreDeletedBranchesMutation: () => ({ mutate: vi.fn() })
}));

vi.mock('../../core/composables/create-get-repository-list-query', () => ({
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

vi.mock('../../core/composables/create-get-branches-query', () => ({
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
	test('renders the trigger button with the selected count', () => {
		const screen = renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });
		const button = screen.getByTestId('open-restore-dialog-button');
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent('Restore');
		expect(button).toHaveTextContent('1');
	});

	test('disables the trigger when no branches are selected', () => {
		selectedBranches = [];
		const screen = renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });
		expect(screen.getByTestId('open-restore-dialog-button')).toBeDisabled();
	});

	test('enables the trigger when at least one branch is selected', () => {
		const screen = renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });
		expect(screen.getByTestId('open-restore-dialog-button')).not.toBeDisabled();
	});
});
