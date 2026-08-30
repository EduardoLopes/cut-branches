import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useRepositoryActions } from '../use-repository-actions.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

// Repository list query — mocked to return a plain object so no QueryClient
// context is needed (mirrors the pattern used by the button tests it replaces).
const mockRepositoryListQuery = vi.hoisted(() => ({
	fn: vi.fn()
}));

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: mockRepositoryListQuery.fn
}));

const mockNotifications = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: mockNotifications
}));

const mockRevealItemInDir = vi.hoisted(() => vi.fn(() => Promise.resolve()));

vi.mock('@tauri-apps/plugin-opener', () => ({
	revealItemInDir: mockRevealItemInDir
}));

const REPO = { id: 'test-repo-id', name: 'Test-Repo', path: '/path/to/repo' };

function listQueryResult(data: unknown) {
	return { data, isLoading: false, isError: false, error: null };
}

const roots: Array<() => void> = [];
function mount(getId: () => string, options?: { onRefresh?: () => Promise<void> }) {
	const { value, cleanup } = withEffectRoot(() => useRepositoryActions(getId, options));
	roots.push(cleanup);
	return value;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockRevealItemInDir.mockImplementation(() => Promise.resolve());
	mockRepositoryListQuery.fn.mockImplementation(() => listQueryResult([REPO]));
});

afterEach(() => {
	while (roots.length) roots.pop()?.();
});

describe('useRepositoryActions', () => {
	test('exposes the matching repository from the list', () => {
		const actions = mount(() => REPO.id);
		expect(actions.repository).toEqual(REPO);
	});

	describe('reveal', () => {
		test('reveals the repository path in the file manager', async () => {
			const actions = mount(() => REPO.id);
			await actions.reveal();

			expect(mockRevealItemInDir).toHaveBeenCalledWith('/path/to/repo');
			expect(mockNotifications.push).not.toHaveBeenCalled();
		});

		test('does nothing when the repository is not found', async () => {
			mockRepositoryListQuery.fn.mockImplementation(() => listQueryResult([]));

			const actions = mount(() => 'missing-repo-id');
			await actions.reveal();

			expect(mockRevealItemInDir).not.toHaveBeenCalled();
			expect(mockNotifications.push).not.toHaveBeenCalled();
		});

		test('pushes a danger notification when revealing fails', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			mockRevealItemInDir.mockImplementation(() => Promise.reject(new Error('boom')));

			const actions = mount(() => REPO.id);
			await actions.reveal();

			expect(mockNotifications.push).toHaveBeenCalledWith({
				title: 'Could not open folder',
				message: 'Failed to reveal **Test-Repo** in the file manager',
				feedback: 'danger'
			});
			expect(consoleError).toHaveBeenCalled();
			consoleError.mockRestore();
		});
	});

	describe('update', () => {
		test('runs the provided refresh and reports success', async () => {
			const onRefresh = vi.fn(() => Promise.resolve());

			const actions = mount(() => REPO.id, { onRefresh });
			await actions.update();

			expect(onRefresh).toHaveBeenCalledOnce();
			expect(mockNotifications.push).toHaveBeenCalledWith({
				title: 'Repository updated',
				message: 'The repository **Test-Repo** was updated',
				feedback: 'success'
			});
			expect(actions.isRefreshing).toBe(false);
		});

		test('falls back to a generic name when the repository is unknown', async () => {
			mockRepositoryListQuery.fn.mockImplementation(() => listQueryResult([]));

			const actions = mount(() => 'missing-repo-id');
			await actions.update();

			expect(mockNotifications.push).toHaveBeenCalledWith({
				title: 'Repository updated',
				message: 'The repository **Repository** was updated',
				feedback: 'success'
			});
		});

		test('pushes a danger notification when the refresh rejects', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const onRefresh = vi.fn(() => Promise.reject(new Error('watch failed')));

			const actions = mount(() => REPO.id, { onRefresh });
			await actions.update();

			expect(mockNotifications.push).toHaveBeenCalledWith({
				title: 'Could not update repository',
				message: 'Failed to update **Test-Repo**: watch failed',
				feedback: 'danger'
			});
			expect(mockNotifications.push).toHaveBeenCalledOnce();
			expect(actions.isRefreshing).toBe(false);
			expect(consoleError).toHaveBeenCalled();
			consoleError.mockRestore();
		});

		test('stringifies non-Error rejections in the danger notification', async () => {
			const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
			const onRefresh = vi.fn(() => Promise.reject('nope'));

			const actions = mount(() => REPO.id, { onRefresh });
			await actions.update();

			expect(mockNotifications.push).toHaveBeenCalledWith({
				title: 'Could not update repository',
				message: 'Failed to update **Test-Repo**: nope',
				feedback: 'danger'
			});
			consoleError.mockRestore();
		});

		test('ignores re-entrant calls while a refresh is in flight', async () => {
			let resolveRefresh: (() => void) | undefined;
			const onRefresh = vi.fn(
				() =>
					new Promise<void>((resolve) => {
						resolveRefresh = resolve;
					})
			);

			const actions = mount(() => REPO.id, { onRefresh });

			const first = actions.update();
			expect(actions.isRefreshing).toBe(true);

			// Second call while the first is pending is a no-op.
			await actions.update();
			expect(onRefresh).toHaveBeenCalledOnce();

			resolveRefresh?.();
			await first;
			expect(actions.isRefreshing).toBe(false);
		});
	});
});
