import { QueryClient } from '@tanstack/svelte-query';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { patchBranchSelectionCaches } from '../patch-branch-selection-caches';
import type { Branch as BranchData, GetBranchListOutput } from '$infrastructure/bindings';
import { mockDataFactory } from '$utils/test-utils';

const REPO = 'repo-1';

function branch(overrides: Partial<BranchData>): BranchData {
	return mockDataFactory.branch(overrides);
}

function listKey(filters?: Record<string, unknown>, repoId = REPO) {
	return ['branch', 'getBranchList', filters ? { repoId, filters } : { repoId }];
}

describe('patchBranchSelectionCaches', () => {
	let queryClient: QueryClient;

	const branches: BranchData[] = [
		branch({ name: 'alpha', isSelected: false }),
		branch({ name: 'beta', isSelected: true }),
		branch({ name: 'current-branch', current: true, isSelected: false }),
		branch({ name: 'locked-branch', isLocked: true, isSelected: false })
	];

	beforeEach(() => {
		queryClient = new QueryClient();
	});

	function seed(key: readonly unknown[], data: BranchData[]) {
		queryClient.setQueryData<GetBranchListOutput>(key as unknown[], { branches: data });
	}

	function read(key: readonly unknown[]) {
		return queryClient.getQueryData<GetBranchListOutput>(key as unknown[]);
	}

	test('flips isSelected in place for a batch update', () => {
		const key = listKey({ deletionStatus: 'active' });
		seed(key, branches);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		const updated = read(key)!.branches;
		expect(updated.find((b) => b.name === 'alpha')?.isSelected).toBe(true);
		expect(updated.find((b) => b.name === 'beta')?.isSelected).toBe(true);
	});

	test('preserves the identity of untouched entries', () => {
		const key = listKey({ deletionStatus: 'active' });
		seed(key, branches);
		const before = read(key)!.branches;

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		const after = read(key)!.branches;
		expect(after.find((b) => b.name === 'beta')).toBe(before.find((b) => b.name === 'beta'));
		expect(after.find((b) => b.name === 'alpha')).not.toBe(before.find((b) => b.name === 'alpha'));
	});

	test('leaves other repositories untouched', () => {
		const otherKey = listKey({ deletionStatus: 'active' }, 'repo-2');
		seed(otherKey, branches);
		const before = read(otherKey);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		expect(read(otherKey)).toBe(before);
	});

	test('does not write when nothing changed', () => {
		const key = listKey({ deletionStatus: 'active' });
		seed(key, branches);
		const before = read(key);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['beta'], // already selected
			isSelected: true
		});

		expect(read(key)).toBe(before);
	});

	test('rebuilds a selected-filtered cache from its unfiltered sibling', () => {
		const allKey = listKey({ deletionStatus: 'active' });
		const selectedKey = listKey({ deletionStatus: 'active', selectionStatus: 'selected' });
		seed(allKey, branches);
		seed(selectedKey, [branches[1]]); // beta

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		const selected = read(selectedKey)!.branches.map((b) => b.name);
		expect(selected).toEqual(['alpha', 'beta']);
	});

	test('removes deselected entries from a selected-filtered cache', () => {
		const allKey = listKey({ deletionStatus: 'active' });
		const selectedKey = listKey({ deletionStatus: 'active', selectionStatus: 'selected' });
		seed(allKey, branches);
		seed(selectedKey, [branches[1]]);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['beta'],
			isSelected: false
		});

		expect(read(selectedKey)!.branches).toEqual([]);
		expect(read(allKey)!.branches.find((b) => b.name === 'beta')?.isSelected).toBe(false);
	});

	test('invalidates a selection-filtered cache when no matching source is cached', () => {
		const selectedKey = listKey({ deletionStatus: 'active', selectionStatus: 'selected' });
		seed(selectedKey, [branches[1]]);
		const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		expect(invalidate).toHaveBeenCalledWith({ queryKey: selectedKey });
	});

	test('select-all respects the exclusion flags and deletion scope', () => {
		const key = listKey({ deletionStatus: 'active' });
		const withDeleted = [...branches, branch({ name: 'gone', deletedAt: '2024-01-01' })];
		seed(key, withDeleted);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'all',
			isSelected: true,
			deletionStatus: 'active',
			excludeLocked: true,
			excludeCurrent: true
		});

		const updated = read(key)!.branches;
		expect(updated.find((b) => b.name === 'alpha')?.isSelected).toBe(true);
		expect(updated.find((b) => b.name === 'locked-branch')?.isSelected).toBe(false);
		expect(updated.find((b) => b.name === 'current-branch')?.isSelected).toBe(false);
		expect(updated.find((b) => b.name === 'gone')?.isSelected).toBe(false);
	});

	test('deselect-all without exclusions clears everything in scope', () => {
		const key = listKey({ deletionStatus: 'active' });
		seed(key, [
			branch({ name: 'a', isSelected: true }),
			branch({ name: 'locked', isLocked: true, isSelected: true })
		]);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'all',
			isSelected: false,
			deletionStatus: 'active',
			excludeLocked: false,
			excludeCurrent: false
		});

		const updated = read(key)!.branches;
		expect(updated.every((b) => !b.isSelected)).toBe(true);
	});

	test("select-all with deletionStatus 'all' spans active and deleted", () => {
		const key = listKey({ deletionStatus: 'all' });
		seed(key, [
			branch({ name: 'active-one', isSelected: false }),
			branch({ name: 'deleted-one', deletedAt: '2024-01-01', isSelected: false })
		]);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'all',
			isSelected: true,
			deletionStatus: 'all',
			excludeLocked: false,
			excludeCurrent: false
		});

		expect(read(key)!.branches.every((b) => b.isSelected)).toBe(true);
	});

	test('ignores caches lacking a filters object (defaults still patch)', () => {
		const key = listKey(); // no filters at all
		seed(key, branches);

		patchBranchSelectionCaches(queryClient, REPO, {
			type: 'batch',
			branchNames: ['alpha'],
			isSelected: true
		});

		expect(read(key)!.branches.find((b) => b.name === 'alpha')?.isSelected).toBe(true);
	});
});
