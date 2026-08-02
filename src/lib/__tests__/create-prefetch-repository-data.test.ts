import { QueryClient } from '@tanstack/svelte-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPrefetchRepositoryData } from '../create-prefetch-repository-data';

// Hoist the mockQueryClient so it can be accessed in vi.mock
const { mockQueryClient } = vi.hoisted(() => {
	return {
		mockQueryClient: { current: null as QueryClient | null }
	};
});

vi.mock('@tanstack/svelte-query', async () => {
	const actual = await vi.importActual('@tanstack/svelte-query');
	return {
		...actual,
		useQueryClient: () => mockQueryClient.current
	};
});

const BRANCHES = [
	{ name: 'feature', current: false },
	{ name: 'main', current: true }
];

const commandResults: Record<string, unknown> = {
	getBranchList: { branches: BRANCHES },
	getRepository: {
		id: 'test-repo',
		name: 'Test Repo',
		path: '/path/to/repo',
		branches: [],
		currentBranch: 'main',
		branchesCount: 0
	},
	listLockedBranches: { branches: [] },
	listWorktrees: { worktrees: [] },
	bulkGetBranchMetrics: { metrics: [] }
};

const executeCommand = vi.fn(async (commandName: string) => commandResults[commandName] ?? {});

// The composable reaches the Tauri layer two ways: `buildCommandExecutor` (via
// `prefetchTauriQuery`) and `executeCommand` (via the bulk-metrics options).
vi.mock('$infrastructure/tauri-commands', () => ({
	buildCommandExecutor: vi.fn((commandName: string) => async () => commandResults[commandName]),
	executeCommand: (commandName: string) => executeCommand(commandName)
}));

const REPO_ID = 'test-repo-id';
const REPO_PATH = '/path/to/repo';

const branchListInput = {
	repoId: REPO_ID,
	filters: { deletionStatus: 'active', includeCurrent: true }
};

const keys = {
	branchList: ['branch', 'getBranchList', branchListInput],
	repository: ['repository', 'getRepository', { id: REPO_ID }],
	lockedBranches: ['locked-branches', 'listLockedBranches', { repoId: REPO_ID }],
	worktrees: ['worktrees', 'listWorktrees', { path: REPO_PATH }],
	// Current branch hoisted first, matching the branch list's own ordering.
	metrics: [
		'bulk-get-branch-metrics',
		'bulkGetBranchMetrics',
		{ path: REPO_PATH, branchNames: ['main', 'feature'] }
	]
};

function branchListKeyFor(repoId: string) {
	return [
		'branch',
		'getBranchList',
		{ repoId, filters: { deletionStatus: 'active', includeCurrent: true } }
	];
}

describe('createPrefetchRepositoryData', () => {
	beforeEach(() => {
		mockQueryClient.current = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
					gcTime: 5 * 60 * 1000 // 5 minutes to prevent premature garbage collection
				}
			}
		});
		commandResults.getBranchList = { branches: BRANCHES };
		vi.clearAllMocks();
	});

	function cached(key: unknown[]) {
		return mockQueryClient.current!.getQueryData(key);
	}

	it('should create a prefetch function', () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		expect(prefetchRepositoryData).toBeInstanceOf(Function);
	});

	it('warms every query the repository page mounts on arrival', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID, REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(keys.branchList)).toBeDefined();
				expect(cached(keys.repository)).toBeDefined();
				expect(cached(keys.lockedBranches)).toBeDefined();
				expect(cached(keys.worktrees)).toBeDefined();
				// Chained behind the branch list — its key needs the branch names.
				expect(cached(keys.metrics)).toBeDefined();
			},
			{ timeout: 1000 }
		);
	});

	it('skips the path-keyed queries when the repository path is unknown', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID);

		await vi.waitFor(
			() => {
				expect(cached(keys.branchList)).toBeDefined();
			},
			{ timeout: 1000 }
		);

		expect(cached(keys.worktrees)).toBeUndefined();
		expect(cached(keys.metrics)).toBeUndefined();
	});

	it('skips the metrics bucket when the repository has no branches', async () => {
		commandResults.getBranchList = { branches: [] };

		const prefetchRepositoryData = createPrefetchRepositoryData();
		prefetchRepositoryData(REPO_ID, REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(keys.branchList)).toBeDefined();
			},
			{ timeout: 1000 }
		);

		expect(executeCommand).not.toHaveBeenCalledWith('bulkGetBranchMetrics');
	});

	it('should prefetch branch list with active deletion status filter', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID, REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(keys.branchList)).toBeDefined();
			},
			{ timeout: 1000 }
		);
	});

	it('should prefetch repository with correct ID', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID, REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(keys.repository)).toBeDefined();
			},
			{ timeout: 1000 }
		);
	});

	it('should debounce multiple rapid calls', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		// Call multiple times rapidly
		prefetchRepositoryData('repo-1', REPO_PATH);
		prefetchRepositoryData('repo-2', REPO_PATH);
		prefetchRepositoryData('repo-3', REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(branchListKeyFor('repo-3'))).toBeDefined();
				expect(cached(['repository', 'getRepository', { id: 'repo-3' }])).toBeDefined();
			},
			{ timeout: 1000 }
		);

		// Earlier calls should not be in cache
		expect(cached(branchListKeyFor('repo-1'))).toBeUndefined();
	});

	it('runs immediately and drops the pending hover prefetch on .now()', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		// A hover over one repository, then a committed click on another: the
		// click wins the queue and the hover never fires.
		prefetchRepositoryData('hovered-repo', REPO_PATH);
		prefetchRepositoryData.now(REPO_ID, REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(keys.branchList)).toBeDefined();
			},
			{ timeout: 1000 }
		);

		expect(cached(branchListKeyFor('hovered-repo'))).toBeUndefined();
	});

	it('cancel() drops a pending hover prefetch', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID, REPO_PATH);
		prefetchRepositoryData.cancel();

		await new Promise((resolve) => setTimeout(resolve, 300));

		expect(cached(keys.branchList)).toBeUndefined();
	});

	it('should respect cache and not refetch if data already exists', async () => {
		const testBranchData = { branches: [{ name: 'existing-branch', current: false }] };
		const testRepoData = {
			id: REPO_ID,
			name: 'Test Repo',
			path: REPO_PATH,
			branches: [],
			currentBranch: 'main',
			branchesCount: 0
		};

		mockQueryClient.current!.setQueryData(keys.branchList, testBranchData);
		mockQueryClient.current!.setQueryData(keys.repository, testRepoData);

		const prefetchRepositoryData = createPrefetchRepositoryData();

		prefetchRepositoryData(REPO_ID, REPO_PATH);

		// Wait for debounce delay
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Data should remain the same (not refetched)
		expect(cached(keys.branchList)).toEqual(testBranchData);
		expect(cached(keys.repository)).toEqual(testRepoData);
	});

	it('swallows prefetch failures so hovering can never surface an error', async () => {
		commandResults.getBranchList = undefined;

		const prefetchRepositoryData = createPrefetchRepositoryData();
		expect(() => prefetchRepositoryData.now(REPO_ID, REPO_PATH)).not.toThrow();

		await new Promise((resolve) => setTimeout(resolve, 100));

		// The chained metrics wave is skipped rather than throwing on a
		// branch list that never landed.
		expect(cached(keys.metrics)).toBeUndefined();
	});

	it('should handle different repository IDs correctly', async () => {
		const prefetchRepositoryData = createPrefetchRepositoryData();

		// First prefetch
		prefetchRepositoryData('repo-1', REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(branchListKeyFor('repo-1'))).toBeDefined();
				expect(cached(['repository', 'getRepository', { id: 'repo-1' }])).toBeDefined();
			},
			{ timeout: 1000 }
		);

		// Second prefetch with different ID
		prefetchRepositoryData('repo-2', REPO_PATH);

		await vi.waitFor(
			() => {
				expect(cached(branchListKeyFor('repo-2'))).toBeDefined();
				expect(cached(['repository', 'getRepository', { id: 'repo-2' }])).toBeDefined();
			},
			{ timeout: 1000 }
		);
	});
});
