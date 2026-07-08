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
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
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
});
