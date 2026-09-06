import type { QueryClient } from '@tanstack/svelte-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { refreshCleanupSummary } from '../use-cleanup-summary.svelte';
import { cleanupSummary } from '$lib/cleanup-summary.svelte';

const { fetchStaleRepositories } = vi.hoisted(() => ({ fetchStaleRepositories: vi.fn() }));

vi.mock(
	'$domains/repository-cleanup/infrastructure/queries/create-list-stale-repositories-query',
	() => ({
		fetchStaleRepositories
	})
);

const queryClient = {} as QueryClient;

beforeEach(() => {
	fetchStaleRepositories.mockReset();
	cleanupSummary.clear();
	localStorage.clear();
});

describe('refreshCleanupSummary', () => {
	it('records the scanned total reclaimable bytes', async () => {
		fetchStaleRepositories.mockResolvedValue({ repositories: [], totalReclaimableBytes: 4096 });
		await refreshCleanupSummary(queryClient);
		expect(fetchStaleRepositories).toHaveBeenCalledWith(queryClient, { thresholdDays: 90 });
		expect(cleanupSummary.reclaimableBytes).toBe(4096);
	});

	it('swallows errors and leaves the summary untouched', async () => {
		cleanupSummary.set(10);
		fetchStaleRepositories.mockRejectedValue(new Error('boom'));
		await expect(refreshCleanupSummary(queryClient)).resolves.toBeUndefined();
		expect(cleanupSummary.reclaimableBytes).toBe(10);
	});
});
