import { beforeEach, describe, expect, it, vi } from 'vitest';
import BranchesLayout from '../+layout.svelte';
import { renderWithTestWrapper } from '$utils/test-utils';

const h = vi.hoisted(() => ({ pathname: '/repos/test-repo-id' }));

// Getters on the object: vitest snapshots a mock factory's exports, so a
// namespace-level getter would freeze at its first value.
vi.mock('$app/state', () => ({
	page: {
		params: { id: 'test-repo-id' },
		get url() {
			return { pathname: h.pathname };
		}
	}
}));

vi.mock('$domains/branch-management/views/branches-view.svelte', async () => ({
	default: (await import('./fixtures/branches-view-stub.svelte')).default
}));

beforeEach(() => {
	h.pathname = '/repos/test-repo-id';
});

describe('branches layout', () => {
	it('renders the active branches for the repository root', async () => {
		const screen = await renderWithTestWrapper(BranchesLayout);

		await expect
			.element(screen.getByTestId('branches-view'))
			.toHaveAttribute('data-id', 'test-repo-id');
		await expect
			.element(screen.getByTestId('branches-view'))
			.toHaveAttribute('data-context', 'active');
	});

	it('renders the deleted branches for the restore route', async () => {
		h.pathname = '/repos/test-repo-id/restore';
		const screen = await renderWithTestWrapper(BranchesLayout);

		await expect
			.element(screen.getByTestId('branches-view'))
			.toHaveAttribute('data-context', 'deleted');
	});
});
