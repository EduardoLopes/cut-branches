import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManageRepositoriesModal from '../manage-repositories-modal.svelte';
import { renderWithTestWrapper, mockDataFactory } from '$utils/test-utils';

const h = vi.hoisted(() => ({
	execute: vi.fn(),
	goto: vi.fn(),
	push: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	repos: [] as any[]
}));

vi.mock('$infrastructure/tauri-commands', () => ({ executeCommand: h.execute }));
vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));
vi.mock('$app/navigation', () => ({ goto: h.goto }));
// `$app/paths` is deliberately not mocked: the encoding assertions below are
// only meaningful against SvelteKit's real resolver.
vi.mock('$app/state', () => ({ page: { params: { id: '1' } } }));
vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: vi.fn(() => ({
		get data() {
			return h.repos;
		},
		isLoading: false,
		isError: false
	}))
}));

// The validation hint renders inside a native <dialog> that is always in the
// DOM; its visibility is the dialog's own open state. Find the open one.
function openHint(): HTMLDialogElement | undefined {
	return [...document.querySelectorAll('dialog[data-popover]')].find(
		(el) => (el as HTMLDialogElement).open
	) as HTMLDialogElement | undefined;
}

beforeEach(() => {
	vi.clearAllMocks();
	h.execute.mockResolvedValue({ success: true });
	h.repos = [
		mockDataFactory.repository({ id: '1', name: 'repo-1', path: '/r1', branchesCount: 2 }),
		mockDataFactory.repository({ id: '2', name: 'repo-2', path: '/r2', branchesCount: 1 }),
		mockDataFactory.repository({ id: '3', name: 'repo-3', path: '/r3', branchesCount: 9 })
	];
});

describe('ManageRepositoriesModal', () => {
	it('lists a selectable row per repository', () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });
		expect(screen.getByTestId('manage-item').elements()).toHaveLength(3);
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 0 repositories');
	});

	it('shows a validation hint and does not remove when nothing is selected', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		const removeButton = screen.getByTestId('manage-remove-selected');
		expect(removeButton).not.toBeDisabled();
		expect(openHint()).toBeUndefined();

		await removeButton.click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Select at least one repository to remove.');
		expect(h.execute).not.toHaveBeenCalled();
	});

	it('dismisses the validation hint on an outside click', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-remove-selected').click();
		await vi.waitFor(() => expect(openHint()).toBeTruthy());

		// A pointerdown outside the popover and its trigger dismisses the hint.
		// Selection is still empty, so only the outside-click path can close it.
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

		await vi.waitFor(() => expect(openHint()).toBeUndefined());
	});

	it('shows an empty state when there are no repositories', () => {
		h.repos = [];
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });
		expect(screen.getByTestId('manage-empty')).toBeInTheDocument();
	});

	it('selecting all updates the remove button and count', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-select-all').click();

		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 3 repositories');
		expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('3 of 3 selected');
	});

	it('re-selects all after select-all, deselecting one, then select-all again', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-select-all').click();
		expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('3 of 3 selected');

		// Deselect one row → partial selection.
		await screen.getByTestId('manage-item').nth(1).click();
		expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('2 of 3 selected');

		// Select-all again must bring every row back, not toggle mid-loop.
		await screen.getByTestId('manage-select-all').click();
		expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('3 of 3 selected');
	});

	it('filters the list by name and shows a no-match state', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByPlaceholder('Search repositories').fill('repo-2');
		await vi.waitFor(() => expect(screen.getByTestId('manage-item').elements()).toHaveLength(1));

		await screen.getByPlaceholder('Search repositories').fill('nope');
		await vi.waitFor(() => expect(screen.getByTestId('manage-no-matches')).toBeInTheDocument());
	});

	it('scopes select-all to the filtered rows', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByPlaceholder('Search repositories').fill('repo-2');
		await vi.waitFor(() => expect(screen.getByTestId('manage-item').elements()).toHaveLength(1));

		await screen.getByTestId('manage-select-all').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() =>
			expect(h.execute).toHaveBeenCalledExactlyOnceWith('deleteRepository', { id: '2' })
		);
	});

	it('removes only the selected repository and stays on the current route', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		// Tick the second repository (repo-2) only — not the active repo (id "1").
		await screen.getByTestId('manage-item').nth(1).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() =>
			expect(h.execute).toHaveBeenCalledExactlyOnceWith('deleteRepository', { id: '2' })
		);
		expect(h.goto).not.toHaveBeenCalled();
	});

	it('navigates to the repos index when the active repository is removed', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-select-all').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(3));
		await vi.waitFor(() => expect(h.goto).toHaveBeenCalledWith('/repos'));
	});

	it('navigates with a percent-encoded id so odd ids still resolve', async () => {
		h.repos = [
			mockDataFactory.repository({ id: '1', name: 'repo-1', path: '/r1' }),
			mockDataFactory.repository({ id: 'a#b?c%d', name: 'repo-odd', path: '/r2' })
		];
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-item').first().click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.goto).toHaveBeenCalledWith('/repos/a%23b%3Fc%25d'));
	});

	it('navigates to a surviving repository when the active one is removed', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		// Select only the active repo (repo-1) so repo-2 survives.
		await screen.getByTestId('manage-item').nth(0).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() =>
			expect(h.execute).toHaveBeenCalledExactlyOnceWith('deleteRepository', { id: '1' })
		);
		await vi.waitFor(() => expect(h.goto).toHaveBeenCalledWith('/repos/2'));
	});
	it('keeps the modal open with the failed repositories still selected', async () => {
		// repo-2 refuses to go; repo-1 (the active one) and repo-3 are removed.
		h.execute.mockImplementation((_command: string, payload: { id: string }) =>
			payload.id === '2' ? Promise.reject(new Error('in use')) : Promise.resolve({ success: true })
		);

		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-select-all').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(3));

		// Only the failure is left ticked, so the user can see what stayed behind.
		await vi.waitFor(() =>
			expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('1 of 3 selected')
		);

		const modal = document.querySelector(
			'[data-testid="manage-repositories-modal"]'
		) as HTMLElement | null;
		expect(modal).toHaveAttribute('open');

		// The active repository did go away, so the dead route is still left behind.
		expect(h.goto).toHaveBeenCalledWith('/repos/2');
	});

	it('closes and clears the selection when every removal succeeds', async () => {
		const screen = renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-item').nth(1).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(1));

		const modal = document.querySelector(
			'[data-testid="manage-repositories-modal"]'
		) as HTMLElement | null;
		await vi.waitFor(() => expect(modal).not.toHaveAttribute('open'));
		expect(screen.getByTestId('manage-selected-count')).toHaveTextContent('0 of 3 selected');
	});
});
