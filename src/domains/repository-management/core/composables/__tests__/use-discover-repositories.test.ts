import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useDiscoverRepositories } from '../use-discover-repositories.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

const h = vi.hoisted(() => ({
	push: vi.fn(),
	invalidate: vi.fn(),
	mutateAsync: vi.fn(),
	exec: vi.fn(),
	listen: vi.fn(),
	unlisten: vi.fn(),
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	listData: [] as any[],
	// Last handler registered for `repository-scan-progress`, so a test can push
	// progress ticks the way the backend would.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	onProgress: undefined as undefined | ((event: any) => void)
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: h.listen
}));

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: h.push }
}));

vi.mock('@tanstack/svelte-query', async (importActual) => ({
	...(await importActual<typeof import('@tanstack/svelte-query')>()),
	useQueryClient: () => ({ invalidateQueries: h.invalidate })
}));

vi.mock('$infrastructure/queries/create-get-repository-list-query', () => ({
	createGetRepositoryListQuery: () => ({ data: h.listData })
}));

vi.mock(
	'$domains/repository-management/infrastructure/mutations/create-discover-repositories-mutation',
	() => ({
		createDiscoverRepositoriesMutation: () => ({
			mutateAsync: h.mutateAsync,
			isPending: false
		})
	})
);

vi.mock('$infrastructure/tauri-commands', () => ({
	executeCommand: h.exec
}));

const roots: Array<() => void> = [];
function mount(options?: { onAdded?: (count: number) => void }) {
	const { value, cleanup } = withEffectRoot(() => useDiscoverRepositories(options));
	roots.push(cleanup);
	return value;
}

function scanOutput(repositories: Array<{ path: string; name: string }>, scanned: string[] = []) {
	return { repositories, scannedRoots: scanned, scannedDirs: repositories.length };
}

beforeEach(() => {
	vi.clearAllMocks();
	h.listData = [];
	h.exec.mockResolvedValue(undefined);
	h.onProgress = undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	h.listen.mockImplementation((_event: string, handler: (event: any) => void) => {
		h.onProgress = handler;
		return Promise.resolve(h.unlisten);
	});
});

afterEach(() => {
	while (roots.length) roots.pop()?.();
});

describe('useDiscoverRepositories', () => {
	it('starts empty and not scanned', () => {
		const discover = mount();
		expect(discover.results).toEqual([]);
		expect(discover.hasScanned).toBe(false);
		expect(discover.isScanning).toBe(false);
		expect(discover.selectedCount).toBe(0);
		expect(discover.addableCount).toBe(0);
	});

	describe('scan', () => {
		it('populates results and preselects not-yet-added repos', async () => {
			h.mutateAsync.mockResolvedValue(
				scanOutput(
					[
						{ path: '/a', name: 'a' },
						{ path: '/b', name: 'b' }
					],
					['/home/user']
				)
			);

			const discover = mount();
			await discover.scan([]);

			expect(h.mutateAsync).toHaveBeenCalledWith({
				roots: [],
				maxDepth: null,
				includeWorktrees: false
			});
			expect(discover.results).toHaveLength(2);
			expect(discover.hasScanned).toBe(true);
			expect(discover.scannedRoots).toEqual(['/home/user']);
			expect(discover.addableCount).toBe(2);
			expect(discover.selectedCount).toBe(2);
			expect(discover.isSelected('/a')).toBe(true);
		});

		it('flags and skips already-added repositories', async () => {
			h.listData = [{ path: '/a', name: 'a' }];
			h.mutateAsync.mockResolvedValue(
				scanOutput([
					{ path: '/a', name: 'a' },
					{ path: '/b', name: 'b' }
				])
			);

			const discover = mount();
			await discover.scan(['/some/root']);

			expect(h.mutateAsync).toHaveBeenCalledWith({
				roots: ['/some/root'],
				maxDepth: null,
				includeWorktrees: false
			});
			expect(discover.results.find((r) => r.path === '/a')?.alreadyAdded).toBe(true);
			expect(discover.addableCount).toBe(1);
			expect(discover.selectedCount).toBe(1);
			expect(discover.isSelected('/a')).toBe(false);
		});
	});

	describe('concurrent scans', () => {
		/** A promise plus its resolver, so a scan can be held mid-flight. */
		function deferred<T>() {
			let resolve!: (value: T) => void;
			const promise = new Promise<T>((r) => (resolve = r));
			return { promise, resolve };
		}

		it('reports isScanning while a scan is in flight', async () => {
			const first = deferred<ReturnType<typeof scanOutput>>();
			h.mutateAsync.mockReturnValueOnce(first.promise);

			const discover = mount();
			const scan = discover.scan();
			expect(discover.isScanning).toBe(true);

			first.resolve(scanOutput([{ path: '/a', name: 'a' }]));
			await scan;
			expect(discover.isScanning).toBe(false);
		});

		it('keeps the newest scan results when an older run finishes last', async () => {
			const first = deferred<ReturnType<typeof scanOutput>>();
			h.mutateAsync
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce(scanOutput([{ path: '/new', name: 'new' }]));

			const discover = mount();
			const stale = discover.scan();
			await discover.scan();

			expect(discover.results.map((r) => r.path)).toEqual(['/new']);

			// The superseded run lands afterwards and must be ignored entirely.
			first.resolve(scanOutput([{ path: '/stale', name: 'stale' }], ['/stale-root']));
			await stale;

			expect(discover.results.map((r) => r.path)).toEqual(['/new']);
			expect(discover.scannedRoots).toEqual([]);
			expect(discover.isScanning).toBe(false);
		});

		it('ignores progress events from a superseded scan', async () => {
			const first = deferred<ReturnType<typeof scanOutput>>();
			h.mutateAsync
				.mockReturnValueOnce(first.promise)
				.mockResolvedValueOnce(scanOutput([{ path: '/new', name: 'new' }]));

			const discover = mount();
			const stale = discover.scan();
			const staleProgress = h.onProgress;

			await discover.scan();
			const currentProgress = discover.progress;

			staleProgress?.({ payload: { scannedDirs: 999, foundCount: 999 } });
			expect(discover.progress).toEqual(currentProgress);

			// The live run's own ticks still land.
			h.onProgress?.({ payload: { scannedDirs: 7, foundCount: 1 } });
			expect(discover.progress).toEqual({ scannedDirs: 7, foundCount: 1 });

			first.resolve(scanOutput([]));
			await stale;
		});

		it('cancelScan discards the in-flight run', async () => {
			const first = deferred<ReturnType<typeof scanOutput>>();
			h.mutateAsync.mockReturnValueOnce(first.promise);

			const discover = mount();
			const stale = discover.scan();
			discover.cancelScan();
			expect(discover.isScanning).toBe(false);

			first.resolve(scanOutput([{ path: '/stale', name: 'stale' }]));
			await stale;

			expect(discover.results).toEqual([]);
			expect(discover.hasScanned).toBe(false);
			expect(discover.isScanning).toBe(false);
		});

		it('scans without progress events when the event bridge is unavailable', async () => {
			h.listen.mockRejectedValue(new Error('not in a tauri runtime'));
			h.mutateAsync.mockResolvedValue(scanOutput([{ path: '/a', name: 'a' }]));

			const discover = mount();
			await discover.scan();

			expect(discover.results).toHaveLength(1);
			expect(h.unlisten).not.toHaveBeenCalled();
		});
	});

	describe('selection', () => {
		beforeEach(() => {
			h.mutateAsync.mockResolvedValue(
				scanOutput([
					{ path: '/a', name: 'a' },
					{ path: '/b', name: 'b' }
				])
			);
		});

		it('toggles a single item off and on', async () => {
			const discover = mount();
			await discover.scan();

			discover.toggle('/a');
			expect(discover.isSelected('/a')).toBe(false);
			expect(discover.selectedCount).toBe(1);

			discover.toggle('/a');
			expect(discover.isSelected('/a')).toBe(true);
			expect(discover.selectedCount).toBe(2);
		});

		it('clears and re-selects all addable items', async () => {
			const discover = mount();
			await discover.scan();

			discover.setAll(false);
			expect(discover.selectedCount).toBe(0);

			discover.setAll(true);
			expect(discover.selectedCount).toBe(2);
		});
	});

	describe('addSelected', () => {
		beforeEach(() => {
			h.mutateAsync.mockResolvedValue(
				scanOutput([
					{ path: '/a', name: 'a' },
					{ path: '/b', name: 'b' }
				])
			);
		});

		it('does nothing when nothing is selected', async () => {
			const discover = mount();
			await discover.scan();
			discover.setAll(false);

			await discover.addSelected();

			expect(h.exec).not.toHaveBeenCalled();
			expect(h.invalidate).not.toHaveBeenCalled();
		});

		it('adds every selected repo, invalidates, notifies, and marks them added', async () => {
			const onAdded = vi.fn();
			const discover = mount({ onAdded });
			await discover.scan();

			await discover.addSelected();

			expect(h.exec).toHaveBeenCalledTimes(2);
			expect(h.exec).toHaveBeenCalledWith('createRepository', { path: '/a' });
			expect(h.exec).toHaveBeenCalledWith('createRepository', { path: '/b' });
			expect(h.invalidate).toHaveBeenCalledWith({ queryKey: ['repository'] });
			expect(h.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repositories added',
				message: 'Added 2 repositories'
			});
			expect(onAdded).toHaveBeenCalledWith(2);
			expect(discover.addableCount).toBe(0);
			expect(discover.selectedCount).toBe(0);
		});

		it('uses singular wording when a single repo is added', async () => {
			h.mutateAsync.mockResolvedValue(scanOutput([{ path: '/a', name: 'a' }]));
			const discover = mount();
			await discover.scan();

			await discover.addSelected();

			expect(h.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: 'Added 1 repository'
			});
		});

		it('reports partial failures alongside successes', async () => {
			h.exec.mockImplementation((_cmd: string, args: { path: string }) =>
				args.path === '/b' ? Promise.reject(new Error('nope')) : Promise.resolve(undefined)
			);

			const discover = mount();
			await discover.scan();

			await discover.addSelected();

			expect(h.push).toHaveBeenCalledWith({
				feedback: 'success',
				title: 'Repository added',
				message: 'Added 1 repository'
			});
			// The reason for the failure reaches the user, not just a count.
			expect(h.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Could not add repository',
				message: '1 repository could not be added:\n\n- `/b` — nope'
			});
			// The successful one is marked added; the failed one stays addable.
			expect(discover.results.find((r) => r.path === '/a')?.alreadyAdded).toBe(true);
			expect(discover.results.find((r) => r.path === '/b')?.alreadyAdded).toBe(false);
		});

		it('reports a danger notification when every add fails', async () => {
			h.exec.mockRejectedValue(new Error('all fail'));

			const discover = mount();
			await discover.scan();

			await discover.addSelected();

			expect(h.invalidate).not.toHaveBeenCalled();
			expect(h.push).toHaveBeenCalledOnce();
			expect(h.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Could not add repositories',
				message: '2 repositories could not be added:\n\n- `/a` — all fail\n- `/b` — all fail'
			});
		});

		it('falls back to a readable message for non-Error rejections', async () => {
			h.exec.mockRejectedValue('disk is full');

			const discover = mount();
			await discover.scan();

			await discover.addSelected();

			expect(h.push).toHaveBeenCalledWith({
				feedback: 'danger',
				title: 'Could not add repositories',
				message:
					'2 repositories could not be added:\n\n- `/a` — disk is full\n- `/b` — disk is full'
			});
		});

		it('ignores re-entrant calls while an add is in flight', async () => {
			// Single repo so the sequential add loop has exactly one in-flight call.
			h.mutateAsync.mockResolvedValue(scanOutput([{ path: '/a', name: 'a' }]));

			let resolveFirst: (() => void) | undefined;
			h.exec.mockImplementation(
				() =>
					new Promise<void>((resolve) => {
						resolveFirst = resolve;
					})
			);

			const discover = mount();
			await discover.scan();

			const first = discover.addSelected();
			expect(discover.isAdding).toBe(true);

			// Second call while adding is a no-op.
			await discover.addSelected();
			expect(h.exec).toHaveBeenCalledTimes(1);

			resolveFirst?.();
			await first;
			expect(discover.isAdding).toBe(false);
		});
	});
});
