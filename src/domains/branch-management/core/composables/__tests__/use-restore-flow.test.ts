import { flushSync } from 'svelte';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { Branch } from '../../models/branch';
import { useRestoreFlow } from '../use-restore-flow.svelte';
import type {
	BatchCreateBranchRestorationsOutput,
	Branch as BranchData,
	CreateBranchRestorationOutput,
	RestoreBranchResult
} from '$lib/bindings';
import { withEffectRoot } from '$utils/with-effect-root.svelte';

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn().mockResolvedValue(() => {})
}));

const { mockPush, singleMutate, batchMutate, captureSingleConfig, captureBatchConfig } = vi.hoisted(
	() => ({
		mockPush: vi.fn(),
		singleMutate: vi.fn(),
		batchMutate: vi.fn(),
		captureSingleConfig: { current: undefined as unknown },
		captureBatchConfig: { current: undefined as unknown }
	})
);

vi.mock('$services/notifications/notifications.svelte', () => ({
	notifications: { push: mockPush }
}));

vi.mock('../create-restore-deleted-branch-mutation', () => ({
	createRestoreDeletedBranchMutation: (opts: unknown) => {
		captureSingleConfig.current = opts;
		return { mutate: singleMutate };
	},
	createRestoreDeletedBranchesMutation: (opts: unknown) => {
		captureBatchConfig.current = opts;
		return { mutate: batchMutate };
	}
}));

let shaCounter = 0;
function nextSha() {
	shaCounter++;
	return shaCounter.toString(16).padStart(40, 'a');
}

function makeBranchData(name: string, fullSha?: string): BranchData {
	const sha = fullSha ?? nextSha();
	return {
		name,
		current: false,
		lastCommit: {
			sha,
			shortSha: sha.slice(0, 7),
			date: '2024-01-01',
			message: 'm',
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

function makeBranch(name: string, fullSha?: string): Branch {
	return Branch.fromData(makeBranchData(name, fullSha));
}

function successResult(branchName: string): RestoreBranchResult {
	return {
		branchName,
		success: true,
		skipped: false,
		requiresUserAction: false,
		message: '',
		conflictDetails: null,
		branch: makeBranchData(branchName)
	};
}

function conflictResult(branchName: string): RestoreBranchResult {
	return {
		branchName,
		success: false,
		skipped: false,
		requiresUserAction: true,
		message: '',
		conflictDetails: { originalName: branchName, conflictingName: branchName },
		branch: null
	};
}

function skippedResult(branchName: string): RestoreBranchResult {
	return {
		branchName,
		success: false,
		skipped: true,
		requiresUserAction: false,
		message: 'skipped',
		conflictDetails: null,
		branch: null
	};
}

const repository = { id: 'repo-1', name: 'my-repo', path: '/p' };

beforeEach(() => {
	mockPush.mockClear();
	singleMutate.mockClear();
	batchMutate.mockClear();
	captureSingleConfig.current = undefined;
	captureBatchConfig.current = undefined;
});

type SingleConfig = {
	onSuccess: (
		data: CreateBranchRestorationOutput,
		variables: { branchInfo: { originalName: string } }
	) => Promise<void>;
	onError: (
		error: { message: string },
		variables: { branchInfo: { originalName: string } }
	) => void;
};
type BatchConfig = {
	onSuccess: (data: BatchCreateBranchRestorationsOutput) => Promise<void>;
	onError: (error: { message: string }) => void;
};

function single(): SingleConfig {
	return captureSingleConfig.current as SingleConfig;
}
function batch(): BatchConfig {
	return captureBatchConfig.current as BatchConfig;
}

describe('useRestoreFlow', () => {
	test('start() does nothing when repository missing', () => {
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => undefined,
				getBranches: () => [makeBranch('a')]
			})
		);
		flow.start();
		expect(singleMutate).not.toHaveBeenCalled();
		expect(batchMutate).not.toHaveBeenCalled();
		cleanup();
	});

	test('single branch path: success closes via onComplete and pushes notification', async () => {
		const onComplete = vi.fn();
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => [makeBranch('feat-a')],
				onComplete
			})
		);
		flow.start();
		expect(singleMutate).toHaveBeenCalledOnce();

		await single().onSuccess(
			{ result: successResult('feat-a') },
			{ branchInfo: { originalName: 'feat-a' } }
		);
		flushSync();

		expect(mockPush).toHaveBeenCalledWith(
			expect.objectContaining({
				feedback: 'success',
				title: 'Branch restored to my-repo repository'
			})
		);
		expect(onComplete).toHaveBeenCalledOnce();
		expect(flow.isProcessing).toBe(false);
		cleanup();
	});

	test('single branch path: conflict surfaces currentConflictBranch and does NOT close', async () => {
		const onComplete = vi.fn();
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => [makeBranch('feat-a')],
				onComplete
			})
		);
		flow.start();

		await single().onSuccess(
			{ result: conflictResult('feat-a') },
			{ branchInfo: { originalName: 'feat-a' } }
		);
		flushSync();

		expect(flow.currentConflictBranch).toBe('feat-a');
		expect(flow.pendingConflictBranches).toContain('feat-a');
		expect(onComplete).not.toHaveBeenCalled();
		expect(mockPush).not.toHaveBeenCalled();
		cleanup();
	});

	test('resolveConflict() fires the single mutation with chosen resolution', async () => {
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => [makeBranch('feat-a')]
			})
		);
		flow.start();
		await single().onSuccess(
			{ result: conflictResult('feat-a') },
			{ branchInfo: { originalName: 'feat-a' } }
		);
		flushSync();

		singleMutate.mockClear();
		flow.resolveConflict('Overwrite');
		expect(singleMutate).toHaveBeenCalledOnce();
		const call = (singleMutate as Mock).mock.calls[0][0];
		expect(call.branchInfo.conflictResolution).toBe('Overwrite');
		expect(flow.currentConflictBranch).toBeNull();
		cleanup();
	});

	test('batch path: all success → single notification, onComplete called', async () => {
		const onComplete = vi.fn();
		const branches = [makeBranch('a'), makeBranch('b')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches,
				onComplete
			})
		);
		flow.start();
		expect(batchMutate).toHaveBeenCalledOnce();

		await batch().onSuccess({ results: [successResult('a'), successResult('b')] });
		flushSync();

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush.mock.calls[0][0].title).toBe('Branches restored to my-repo repository');
		expect(onComplete).toHaveBeenCalledOnce();
		cleanup();
	});

	test('batch path with conflict: notification deferred, modal stays open (BUG FIX)', async () => {
		const onComplete = vi.fn();
		const branches = [makeBranch('ok'), makeBranch('clash')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches,
				onComplete
			})
		);
		flow.start();
		await batch().onSuccess({
			results: [successResult('ok'), conflictResult('clash')]
		});
		flushSync();

		// Critical: NO notification yet, modal NOT closed, conflict UI surfaces
		expect(mockPush).not.toHaveBeenCalled();
		expect(onComplete).not.toHaveBeenCalled();
		expect(flow.currentConflictBranch).toBe('clash');
		expect(flow.pendingConflictBranches).toEqual(['clash']);
		expect(flow.isProcessing).toBe(true);

		// User picks Overwrite → single mutation runs
		flow.resolveConflict('Overwrite');
		await single().onSuccess(
			{ result: successResult('clash') },
			{ branchInfo: { originalName: 'clash' } }
		);
		flushSync();

		// Now we get exactly one notification covering BOTH restored branches
		expect(mockPush).toHaveBeenCalledTimes(1);
		const call = mockPush.mock.calls[0][0];
		expect(call.feedback).toBe('success');
		expect(call.title).toBe('Branches restored to my-repo repository');
		expect(call.message).toContain('**ok**');
		expect(call.message).toContain('**clash**');
		expect(onComplete).toHaveBeenCalledOnce();
		cleanup();
	});

	test('skipped branches do NOT contribute to success notification', async () => {
		const branches = [makeBranch('a'), makeBranch('b')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		await batch().onSuccess({
			results: [successResult('a'), skippedResult('b')]
		});
		flushSync();

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush.mock.calls[0][0].title).toBe('Branch restored to my-repo repository');
		expect(mockPush.mock.calls[0][0].message).not.toContain('**b**');
		cleanup();
	});

	test('batch onError: pushes danger toast and clears isProcessing', async () => {
		const branches = [makeBranch('a'), makeBranch('b')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		batch().onError({ message: 'boom' });
		flushSync();
		expect(mockPush).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', message: 'boom' })
		);
		expect(flow.isProcessing).toBe(false);
		cleanup();
	});

	test('single onError: continues to next branch', async () => {
		const branches = [makeBranch('a')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		single().onError({ message: 'oops' }, { branchInfo: { originalName: 'a' } });
		flushSync();

		expect(mockPush).toHaveBeenCalledWith(
			expect.objectContaining({ feedback: 'danger', title: 'Error restoring branch a' })
		);
		// All processed; complete() runs, isProcessing flips off
		expect(flow.isProcessing).toBe(false);
		cleanup();
	});

	test('setPreference seeds branchPreferences', () => {
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => []
			})
		);
		flow.setPreference('a', 'Skip');
		expect(flow.branchPreferences['a']).toBe('Skip');
		cleanup();
	});

	test('reset() clears all state', async () => {
		const branches = [makeBranch('a')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		await single().onSuccess(
			{ result: conflictResult('a') },
			{ branchInfo: { originalName: 'a' } }
		);
		flushSync();
		expect(flow.currentConflictBranch).toBe('a');

		flow.reset();
		expect(flow.currentConflictBranch).toBeNull();
		expect(flow.pendingConflictBranches).toEqual([]);
		expect(flow.isProcessing).toBe(false);
		expect(flow.restorationResults).toEqual({});
		cleanup();
	});

	test('inFlightBranches: tracks resolveConflict mutation across its lifecycle', async () => {
		const branches = [makeBranch('a'), makeBranch('b')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		// Batch is in flight for both
		expect(flow.inFlightBranches).toEqual(expect.arrayContaining(['a', 'b']));

		await batch().onSuccess({ results: [successResult('a'), conflictResult('b')] });
		flushSync();

		// Batch resolved — neither in flight any longer
		expect(flow.inFlightBranches).toEqual([]);
		expect(flow.currentConflictBranch).toBe('b');

		// User resolves the conflict — `b` goes back in flight while the single
		// mutation runs.
		flow.resolveConflict('Skip');
		expect(flow.inFlightBranches).toContain('b');

		await single().onSuccess(
			{ result: { ...successResult('b'), success: false, skipped: true } },
			{ branchInfo: { originalName: 'b' } }
		);
		flushSync();
		expect(flow.inFlightBranches).toEqual([]);
		cleanup();
	});

	test('isRestorationComplete becomes true after all branches resolve', async () => {
		const branches = [makeBranch('a')];
		const { value: flow, cleanup } = withEffectRoot(() =>
			useRestoreFlow({
				getRepository: () => repository,
				getBranches: () => branches
			})
		);
		flow.start();
		expect(flow.isRestorationComplete).toBe(false);

		await single().onSuccess({ result: successResult('a') }, { branchInfo: { originalName: 'a' } });
		flushSync();
		expect(flow.isRestorationComplete).toBe(true);
		cleanup();
	});
});
