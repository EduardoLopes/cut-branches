import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod/v4';
import { useStaleRepositories } from '../use-stale-repositories.svelte';
import { createStaleQueryMock } from './stale-query-mock.svelte';
import type {
	CleanupTarget,
	ListStaleRepositoriesOutput,
	StaleRepository
} from '$infrastructure/bindings';
import { cleanupSummary } from '$lib/cleanup-summary.svelte';
import { Store } from '$lib/store.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const { holder, executeCommand, push } = vi.hoisted(() => ({
	holder: { query: null as ReturnType<typeof createStaleQueryMock>['query'] | null },
	executeCommand: vi.fn(),
	push: vi.fn()
}));

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn().mockResolvedValue(() => {}) }));
vi.mock('@tanstack/svelte-query', () => ({ useQueryClient: () => ({}) }));
vi.mock(
	'$domains/repository-cleanup/infrastructure/queries/create-list-stale-repositories-query',
	() => ({
		createListStaleRepositoriesQuery: () => holder.query,
		removeCleanedTargetFromCache: vi.fn()
	})
);
vi.mock('$infrastructure/tauri-commands', () => ({ executeCommand }));
vi.mock('$services/notifications/notifications.svelte', () => ({ notifications: { push } }));

function target(path: string, sizeBytes: number) {
	return { path, folderName: path.split('/').pop() ?? path, sizeBytes };
}

function repo(id: string, targets: CleanupTarget[]): StaleRepository {
	return {
		id,
		name: id,
		path: `/${id}`,
		staleSince: 0,
		reclaimableBytes: targets.reduce((s, t) => s + t.sizeBytes, 0),
		targets
	};
}

function output(repos: StaleRepository[]): ListStaleRepositoriesOutput {
	return {
		repositories: repos,
		totalReclaimableBytes: repos.reduce((s, r) => s + r.reclaimableBytes, 0)
	};
}

let mock: ReturnType<typeof createStaleQueryMock>;

beforeEach(() => {
	executeCommand.mockReset();
	push.mockReset();
	cleanupSummary.clear();
	localStorage.clear();
	Store.getInstance(['cleanup-keeplist'], z.record(z.string(), z.array(z.string())), {}).set({});
	mock = createStaleQueryMock();
	holder.query = mock.query;
});

/** Creates the composable and resolves the query with the given repos. */
function setup(repos: StaleRepository[]) {
	const { value: stale, cleanup } = withEffectRoot(() => useStaleRepositories());
	mock.set(output(repos));
	flushSync();
	return { stale, cleanup };
}

describe('useStaleRepositories', () => {
	it('selects every path by default once the query resolves', () => {
		const { stale, cleanup } = setup([
			repo('r1', [target('/r1/node_modules', 100)]),
			repo('r2', [target('/r2/dist', 50), target('/r2/build', 25)])
		]);

		expect(stale.repositoryCount).toBe(2);
		expect(stale.totalReclaimableBytes).toBe(175);
		expect(stale.selectedCount).toBe(2);
		expect(stale.selectedBytes).toBe(175);
		expect(stale.isScanning).toBe(false);
		expect(stale.isRepoAllSelected('r2')).toBe(true);
		expect(cleanupSummary.reclaimableBytes).toBe(175);
		cleanup();
	});

	it('exposes the first-load scanning state before data arrives', () => {
		const { value: stale, cleanup } = withEffectRoot(() => useStaleRepositories());
		flushSync();
		expect(stale.isScanning).toBe(true);
		expect(stale.repositoryCount).toBe(0);
		cleanup();
	});

	it('toggling a path updates selection, size and indeterminate state', () => {
		const { stale, cleanup } = setup([
			repo('r2', [target('/r2/dist', 50), target('/r2/build', 25)])
		]);

		stale.toggleTarget('r2', '/r2/dist');
		flushSync();

		expect(stale.isTargetSelected('r2', '/r2/dist')).toBe(false);
		expect(stale.repoSelectedCount('r2')).toBe(1);
		expect(stale.isRepoIndeterminate('r2')).toBe(true);
		expect(stale.selectedBytes).toBe(25);
		cleanup();
	});

	it('setAll toggles selection across every repository', () => {
		const { stale, cleanup } = setup([
			repo('r1', [target('/r1/node_modules', 100)]),
			repo('r2', [target('/r2/dist', 50), target('/r2/build', 25)])
		]);

		expect(stale.allSelected).toBe(true);
		stale.setAll(false);
		flushSync();
		expect(stale.allSelected).toBe(false);
		expect(stale.selectedCount).toBe(0);

		stale.toggleTarget('r1', '/r1/node_modules');
		flushSync();
		expect(stale.someSelected).toBe(true);

		stale.setAll(true);
		flushSync();
		expect(stale.allSelected).toBe(true);
		cleanup();
	});

	it('toggleRepo deselects then reselects a repository, ignoring unknown ids', () => {
		const { stale, cleanup } = setup([repo('r1', [target('/r1/node_modules', 100)])]);

		stale.toggleRepo('r1', false);
		flushSync();
		expect(stale.repoSelectedCount('r1')).toBe(0);

		stale.toggleRepo('missing', false);
		flushSync();
		expect(stale.repoSelectedCount('missing')).toBe(0);

		stale.toggleRepo('r1', true);
		flushSync();
		expect(stale.isRepoAllSelected('r1')).toBe(true);
		cleanup();
	});

	it('cleans each selected repository and reports success', async () => {
		const { stale, cleanup } = setup([
			repo('r1', [target('/r1/node_modules', 100)]),
			repo('r2', [target('/r2/coverage', 10)])
		]);

		executeCommand.mockImplementation(async (_cmd: string, input: { targets: string[] }) => ({
			freedBytes: input.targets.length * 10,
			results: input.targets.map((path) => ({ path, ok: true, bytesFreed: 10, error: null }))
		}));

		await stale.cleanSelected('permanent');
		flushSync();

		expect(executeCommand).toHaveBeenCalledTimes(2);
		// No approvedExtra/allowlist; the backend re-derives the ignore set. The
		// list itself updates via the `cleanup-target-cleaned` event, not a re-scan.
		expect(executeCommand).toHaveBeenCalledWith(
			'cleanRepository',
			expect.objectContaining({ repositoryId: 'r2', targets: ['/r2/coverage'], mode: 'permanent' })
		);
		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'success' }));
		cleanup();
	});

	it('does not count a repository whose every folder failed as cleaned', async () => {
		const { stale, cleanup } = setup([repo('r1', [target('/r1/dist', 10)])]);

		// The command itself succeeds, but the one folder it touched did not.
		executeCommand.mockImplementation(async (_cmd: string, input: { targets: string[] }) => ({
			freedBytes: 0,
			results: input.targets.map((path) => ({
				path,
				ok: false,
				bytesFreed: 0,
				error: 'permission denied'
			}))
		}));

		await stale.cleanSelected('permanent');
		flushSync();

		expect(push).toHaveBeenCalledWith(
			expect.objectContaining({
				feedback: 'warning',
				title: 'Cleaned 0 repositories'
			})
		);
		cleanup();
	});

	it('counts a thrown command as failed and warns', async () => {
		const { stale, cleanup } = setup([repo('r1', [target('/r1/dist', 10)])]);
		executeCommand.mockRejectedValue(new Error('crash'));

		await stale.cleanSelected('trash');
		flushSync();

		expect(push).toHaveBeenCalledWith(expect.objectContaining({ feedback: 'warning' }));
		cleanup();
	});

	it('does nothing when no path is selected', async () => {
		const { stale, cleanup } = setup([repo('r1', [target('/r1/dist', 10)])]);
		stale.toggleRepo('r1', false);
		flushSync();

		await stale.cleanSelected('trash');
		flushSync();

		expect(executeCommand).not.toHaveBeenCalled();
		expect(push).not.toHaveBeenCalled();
		cleanup();
	});
});
