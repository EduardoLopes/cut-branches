import { QueryClient } from '@tanstack/svelte-query';
import { describe, it, expect } from 'vitest';
import {
	removeCleanedTargetFromCache,
	staleRepositoriesQueryKey
} from '../create-list-stale-repositories-query';
import type { ListStaleRepositoriesOutput } from '$infrastructure/bindings';

function seed(): ListStaleRepositoriesOutput {
	return {
		repositories: [
			{
				id: 'r1',
				name: 'r1',
				path: '/r1',
				staleSince: 0,
				reclaimableBytes: 150,
				targets: [
					{ path: '/r1/node_modules', folderName: 'node_modules', sizeBytes: 100 },
					{ path: '/r1/dist', folderName: 'dist', sizeBytes: 50 }
				]
			},
			{
				id: 'r2',
				name: 'r2',
				path: '/r2',
				staleSince: 0,
				reclaimableBytes: 20,
				targets: [{ path: '/r2/build', folderName: 'build', sizeBytes: 20 }]
			}
		],
		totalReclaimableBytes: 170
	};
}

const key = staleRepositoriesQueryKey({ thresholdDays: 90 });

describe('removeCleanedTargetFromCache', () => {
	it('removes a cleaned target and recomputes sizes', () => {
		const qc = new QueryClient();
		qc.setQueryData(key, seed());

		removeCleanedTargetFromCache(qc, { repositoryId: 'r1', path: '/r1/node_modules' });

		const data = qc.getQueryData<ListStaleRepositoriesOutput>(key)!;
		const r1 = data.repositories.find((r) => r.id === 'r1')!;
		expect(r1.targets.map((t) => t.path)).toEqual(['/r1/dist']);
		expect(r1.reclaimableBytes).toBe(50);
		expect(data.totalReclaimableBytes).toBe(70);
	});

	it('drops a repository whose last target was cleaned', () => {
		const qc = new QueryClient();
		qc.setQueryData(key, seed());

		removeCleanedTargetFromCache(qc, { repositoryId: 'r2', path: '/r2/build' });

		const data = qc.getQueryData<ListStaleRepositoriesOutput>(key)!;
		expect(data.repositories.map((r) => r.id)).toEqual(['r1']);
		expect(data.totalReclaimableBytes).toBe(150);
	});

	it('leaves the cache unchanged when the path is not found', () => {
		const qc = new QueryClient();
		qc.setQueryData(key, seed());

		removeCleanedTargetFromCache(qc, { repositoryId: 'r1', path: '/r1/missing' });

		const data = qc.getQueryData<ListStaleRepositoriesOutput>(key)!;
		expect(data.totalReclaimableBytes).toBe(170);
		expect(data.repositories.find((r) => r.id === 'r1')!.targets).toHaveLength(2);
	});

	it('is a no-op when the cache entry holds no data', () => {
		const qc = new QueryClient();
		// An entry that exists but has undefined data.
		qc.setQueryData<ListStaleRepositoriesOutput | undefined>(key, () => undefined);

		removeCleanedTargetFromCache(qc, { repositoryId: 'r1', path: '/r1/dist' });

		expect(qc.getQueryData(key)).toBeUndefined();
	});
});
