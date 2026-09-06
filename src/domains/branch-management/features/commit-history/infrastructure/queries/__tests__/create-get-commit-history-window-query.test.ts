import { QueryClient } from '@tanstack/svelte-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
	fetchCommitHistoryWindow,
	fetchCommitLocation
} from '../create-get-commit-history-window-query';
import type { AppError } from '$infrastructure/bindings';

const { executeCommand } = vi.hoisted(() => ({
	executeCommand: vi.fn(async () => ({
		commits: [],
		startIndex: 5,
		targetIndex: 7,
		nextCursor: 'digest:30',
		totalCount: 100
	}))
}));

vi.mock('$infrastructure/tauri-commands', () => ({ executeCommand }));

let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
	executeCommand.mockClear();
});

describe('fetchCommitHistoryWindow', () => {
	it('sends the wire input with defaults and keeps repoId in the key only', async () => {
		await fetchCommitHistoryWindow(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			targetSha: 'abc1234'
		});

		expect(executeCommand).toHaveBeenCalledWith('getCommitHistoryWindow', {
			path: '/repo',
			targetSha: 'abc1234',
			contextBefore: 0,
			limit: 1
		});

		const key = [
			'commit-history-window',
			'getCommitHistoryWindow',
			{ repoId: 'repo-1', path: '/repo', targetSha: 'abc1234', contextBefore: 0, limit: 1 }
		];
		expect(queryClient.getQueryData(key)).toBeDefined();
	});

	it('passes explicit window bounds through', async () => {
		await fetchCommitHistoryWindow(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			targetSha: 'abc1234',
			contextBefore: 10,
			limit: 25
		});

		expect(executeCommand).toHaveBeenCalledWith('getCommitHistoryWindow', {
			path: '/repo',
			targetSha: 'abc1234',
			contextBefore: 10,
			limit: 25
		});
	});

	it('serves a repeated request from the cache', async () => {
		const input = { repoId: 'repo-1', path: '/repo', targetSha: 'abc1234' };
		await fetchCommitHistoryWindow(queryClient, input);
		await fetchCommitHistoryWindow(queryClient, input);
		expect(executeCommand).toHaveBeenCalledTimes(1);
	});
});

describe('fetchCommitLocation', () => {
	it('extracts the target index from a minimal window', async () => {
		const location = await fetchCommitLocation(queryClient, {
			repoId: 'repo-1',
			path: '/repo',
			targetSha: 'abc1234'
		});

		expect(location).toEqual({ targetIndex: 7, totalCount: 100 });
		expect(executeCommand).toHaveBeenCalledWith('getCommitHistoryWindow', {
			path: '/repo',
			targetSha: 'abc1234',
			contextBefore: 0,
			limit: 1
		});
	});

	it('propagates a commit_not_found error', async () => {
		const error: AppError = {
			message: 'Commit **nope** not found in the repository',
			kind: 'commit_not_found',
			description: null
		};
		executeCommand.mockRejectedValueOnce(error);

		await expect(
			fetchCommitLocation(queryClient, { repoId: 'repo-1', path: '/repo', targetSha: 'nope123' })
		).rejects.toEqual(error);
	});
});
