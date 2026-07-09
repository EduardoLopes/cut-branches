import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AddWorktreeModal from '../add-worktree-modal.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	stub: undefined as any
}));

vi.mock('../../core/composables/use-add-worktree-flow.svelte', () => ({
	useAddWorktreeFlow: vi.fn(() => h.stub)
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStub(overrides: Record<string, any> = {}) {
	return {
		selectedParent: null,
		isAdding: false,
		pickDirectory: vi.fn(() => Promise.resolve()),
		reset: vi.fn(),
		add: vi.fn(() => Promise.resolve(true)),
		...overrides
	};
}

function openHint(): HTMLDialogElement | undefined {
	return [...document.querySelectorAll('dialog[data-popover]')].find(
		(el) => (el as HTMLDialogElement).open
	) as HTMLDialogElement | undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	h.stub = makeStub();
});

describe('AddWorktreeModal', () => {
	it('invokes the directory picker', async () => {
		const screen = renderWithTestWrapper(AddWorktreeModal, { open: true, repoPath: '/repo' });
		await tick();

		await screen.getByTestId('add-worktree-pick-dir').click();
		expect(h.stub.pickDirectory).toHaveBeenCalled();
	});

	it('shows a validation hint and does not add when required fields are missing', async () => {
		const screen = renderWithTestWrapper(AddWorktreeModal, { open: true, repoPath: '/repo' });
		await tick();

		await screen.getByTestId('add-worktree-confirm').click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Enter a name for the worktree.');
		expect(h.stub.add).not.toHaveBeenCalled();
	});

	it('prompts for a directory once a name is entered', async () => {
		const screen = renderWithTestWrapper(AddWorktreeModal, { open: true, repoPath: '/repo' });
		await tick();

		await screen.getByTestId('add-worktree-name').fill('hotfix');
		await screen.getByTestId('add-worktree-confirm').click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Choose a directory for the worktree.');
		expect(h.stub.add).not.toHaveBeenCalled();
	});

	it('adds the worktree once name and directory are provided', async () => {
		h.stub = makeStub({ selectedParent: '/chosen' });
		const screen = renderWithTestWrapper(AddWorktreeModal, { open: true, repoPath: '/repo' });
		await tick();

		await screen.getByTestId('add-worktree-name').fill('hotfix');
		await screen.getByTestId('add-worktree-reference').fill('feature');
		await screen.getByTestId('add-worktree-confirm').click();

		await vi.waitFor(() =>
			expect(h.stub.add).toHaveBeenCalledWith({
				name: 'hotfix',
				reference: 'feature',
				lock: false
			})
		);
	});
});
