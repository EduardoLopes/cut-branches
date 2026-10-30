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

type Screen = Awaited<ReturnType<typeof renderWithTestWrapper>>;

/** The list header's select-all (it covers the rows the filter leaves). */
function selectAll(screen: Screen) {
	return screen
		.getByRole('grid', { name: 'Repositories' })
		.getByRole('columnheader')
		.getByRole('checkbox');
}

/** A repository row's checkbox (the row itself toggles too, see below). */
function rowCheckbox(screen: Screen, name: string) {
	return screen.getByRole('row').filter({ hasText: name }).getByRole('checkbox');
}

describe('ManageRepositoriesModal', () => {
	it('lists a selectable row per repository', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });
		expect(screen.getByTestId('manage-item').elements()).toHaveLength(3);
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 0 repositories');
	});

	it('shows a validation hint and does not remove when nothing is selected', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		const removeButton = screen.getByTestId('manage-remove-selected');
		expect(removeButton).not.toBeDisabled();
		expect(openHint()).toBeUndefined();

		await removeButton.click();

		await vi.waitFor(() => expect(openHint()).toBeTruthy());
		expect(openHint()?.textContent).toContain('Select at least one repository to remove.');
		expect(h.execute).not.toHaveBeenCalled();
	});

	it('dismisses the validation hint on an outside click', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-remove-selected').click();
		await vi.waitFor(() => expect(openHint()).toBeTruthy());

		// A pointerdown outside the popover and its trigger dismisses the hint.
		// Selection is still empty, so only the outside-click path can close it.
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

		await vi.waitFor(() => expect(openHint()).toBeUndefined());
	});

	it('shows an empty state when there are no repositories', async () => {
		h.repos = [];
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });
		expect(screen.getByTestId('manage-empty')).toBeInTheDocument();
	});

	it('selecting all updates the remove button', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await selectAll(screen).click();

		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 3 repositories');
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 3 repositories');
	});

	it('re-selects all after select-all, deselecting one, then select-all again', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await selectAll(screen).click();
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 3 repositories');

		// Deselect one row → partial selection.
		await rowCheckbox(screen, 'repo-2').click();
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 2 repositories');

		// Select-all again must bring every row back, not toggle mid-loop.
		await selectAll(screen).click();
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 3 repositories');
	});

	it('filters the list by name and shows a no-match state', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByPlaceholder('Search repositories').fill('repo-2');
		await vi.waitFor(() => expect(screen.getByTestId('manage-item').elements()).toHaveLength(1));

		await screen.getByPlaceholder('Search repositories').fill('nope');
		await vi.waitFor(() => expect(screen.getByTestId('manage-no-matches')).toBeInTheDocument());
	});

	it('scopes select-all to the filtered rows', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByPlaceholder('Search repositories').fill('repo-2');
		await vi.waitFor(() => expect(screen.getByTestId('manage-item').elements()).toHaveLength(1));

		await selectAll(screen).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() =>
			expect(h.execute).toHaveBeenCalledExactlyOnceWith('deleteRepository', { id: '2' })
		);
	});

	it('removes only the selected repository and stays on the current route', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		// Tick the second repository (repo-2) only — not the active repo (id "1").
		await rowCheckbox(screen, 'repo-2').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() =>
			expect(h.execute).toHaveBeenCalledExactlyOnceWith('deleteRepository', { id: '2' })
		);
		expect(h.goto).not.toHaveBeenCalled();
	});

	it('disables Remove while the batch is running', async () => {
		// A removal that never settles keeps the mutation pending.
		h.execute.mockImplementation(() => new Promise(() => {}));
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await rowCheckbox(screen, 'repo-2').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(screen.getByTestId('manage-remove-selected')).toBeDisabled());
	});

	it('navigates to the repos index when the active repository is removed', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await selectAll(screen).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(3));
		await vi.waitFor(() => expect(h.goto).toHaveBeenCalledWith('/repos'));
	});

	it('navigates with a percent-encoded id so odd ids still resolve', async () => {
		h.repos = [
			mockDataFactory.repository({ id: '1', name: 'repo-1', path: '/r1' }),
			mockDataFactory.repository({ id: 'a#b?c%d', name: 'repo-odd', path: '/r2' })
		];
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await rowCheckbox(screen, 'repo-1').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.goto).toHaveBeenCalledWith('/repos/a%23b%3Fc%25d'));
	});

	it('navigates to a surviving repository when the active one is removed', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		// Select only the active repo (repo-1) so repo-2 survives.
		await rowCheckbox(screen, 'repo-1').click();
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

		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await selectAll(screen).click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(3));

		// Only the failure is left ticked, so the user can see what stayed behind.
		await vi.waitFor(() =>
			expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 1 repository')
		);

		const modal = document.querySelector(
			'[data-testid="manage-repositories-modal"]'
		) as HTMLElement | null;
		expect(modal).toHaveAttribute('open');

		// The active repository did go away, so the dead route is still left behind.
		expect(h.goto).toHaveBeenCalledWith('/repos/2');
	});

	it('closes and clears the selection when every removal succeeds', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await rowCheckbox(screen, 'repo-2').click();
		await screen.getByTestId('manage-remove-selected').click();

		await vi.waitFor(() => expect(h.execute).toHaveBeenCalledTimes(1));

		const modal = document.querySelector(
			'[data-testid="manage-repositories-modal"]'
		) as HTMLElement | null;
		await vi.waitFor(() => expect(modal).not.toHaveAttribute('open'));
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 0 repositories');
	});

	it('toggles a repository from anywhere on its row', async () => {
		const screen = await renderWithTestWrapper(ManageRepositoriesModal, { open: true });

		await screen.getByTestId('manage-item').nth(1).click();
		expect(screen.getByTestId('manage-remove-selected')).toHaveTextContent('Remove 1 repository');
		await expect.element(rowCheckbox(screen, 'repo-2')).toBeChecked();
	});
});
