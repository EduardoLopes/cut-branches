import { tick } from 'svelte';
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

// The validation hint renders inside a native <dialog> that is always present;
// its visibility is the dialog's own open state. Find the open one.
function openHint(): HTMLDialogElement | undefined {
	return [...document.querySelectorAll('dialog[data-popover]')].find(
		(el) => (el as HTMLDialogElement).open
	) as HTMLDialogElement | undefined;
}

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

	test('keeps the trigger enabled and shows a validation hint when nothing to restore', async () => {
		selectedBranches = [];
		const screen = renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });
		const button = screen.getByTestId('open-restore-dialog-button');
		expect(button).not.toBeDisabled();

		await button.click();
		await tick();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('There are no deleted branches to restore.');
	});

	test('enables the trigger when at least one branch is selected', () => {
		const screen = renderWithTestWrapper(RestoreDeletedBranchModal, { repoId: 'r1' });
		expect(screen.getByTestId('open-restore-dialog-button')).not.toBeDisabled();
	});
});
