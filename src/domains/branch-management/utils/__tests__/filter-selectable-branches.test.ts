import { describe, test, expect } from 'vitest';
import { filterSelectableBranches } from '../filter-selectable-branches';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$infrastructure/bindings';

const createBranch = (name: string, isLocked = false): Branch => {
	const branchData: BranchData = {
		name,
		current: false,
		fullyMerged: false,
		upstream: null,
		lastCommit: {
			sha: 'abc123def456',
			shortSha: 'abc123d',
			date: '2024-01-15T10:30:00Z',
			message: 'Test commit',
			summary: 'Test commit',
			author: 'Test User',
			email: 'test@example.com'
		},
		deletedAt: null,
		isReachable: null,
		isSelected: false,
		isLocked
	};
	return Branch.fromData(branchData);
};

describe('filterSelectableBranches', () => {
	const branches: Branch[] = [
		createBranch('main'),
		createBranch('feature-1'),
		createBranch('feature-2'),
		createBranch('hotfix-1')
	];

	describe('current branch filtering', () => {
		test('excludes current branch from results', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main'
			});

			expect(result).toHaveLength(3);
			expect(result.find((b) => b.getName() === 'main')).toBeUndefined();
		});

		test('includes all branches when currentBranch is undefined', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: undefined
			});

			expect(result).toHaveLength(4);
		});

		test('includes all branches when currentBranch does not match any branch', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'nonexistent'
			});

			expect(result).toHaveLength(4);
		});
	});

	describe('locked branch filtering', () => {
		test('excludes locked branches from results', () => {
			const branchesWithLocked: Branch[] = [
				createBranch('main'),
				createBranch('feature-1', true),
				createBranch('feature-2'),
				createBranch('hotfix-1')
			];

			const result = filterSelectableBranches({
				branches: branchesWithLocked,
				currentBranch: 'main'
			});

			expect(result).toHaveLength(2);
			expect(result.find((b) => b.getName() === 'feature-1')).toBeUndefined();
		});

		test('excludes both current and locked branches', () => {
			const branchesWithLocked: Branch[] = [
				createBranch('main'),
				createBranch('feature-1', true),
				createBranch('feature-2'),
				createBranch('hotfix-1', true)
			];

			const result = filterSelectableBranches({
				branches: branchesWithLocked,
				currentBranch: 'main'
			});

			expect(result).toHaveLength(1);
			expect(result[0].getName()).toBe('feature-2');
		});
	});

	describe('search query filtering', () => {
		test('filters branches by search query', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: 'feature'
			});

			expect(result).toHaveLength(2);
			expect(result.map((b) => b.getName())).toEqual(['feature-1', 'feature-2']);
		});

		test('search is case-insensitive', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: 'FEATURE'
			});

			expect(result).toHaveLength(2);
		});

		test('trims whitespace from search query', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: '  feature  '
			});

			expect(result).toHaveLength(2);
		});

		test('returns all selectable branches when search query is empty string', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: ''
			});

			expect(result).toHaveLength(3);
		});

		test('returns all selectable branches when search query is undefined', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: undefined
			});

			expect(result).toHaveLength(3);
		});

		test('returns empty array when no branches match search query', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: 'nonexistent'
			});

			expect(result).toHaveLength(0);
		});

		test('search applies to partial matches', () => {
			const result = filterSelectableBranches({
				branches,
				currentBranch: 'main',
				searchQuery: 'fix'
			});

			expect(result).toHaveLength(1);
			expect(result[0].getName()).toBe('hotfix-1');
		});
	});

	describe('combined filtering', () => {
		test('applies all filters together', () => {
			const branchesWithLocked: Branch[] = [
				createBranch('main'),
				createBranch('feature-1', true),
				createBranch('feature-2'),
				createBranch('feature-3'),
				createBranch('hotfix-1')
			];

			const result = filterSelectableBranches({
				branches: branchesWithLocked,
				currentBranch: 'main',
				searchQuery: 'feature'
			});

			// Should exclude: main (current), feature-1 (locked)
			// Should include: feature-2, feature-3 (match search)
			// Should exclude: hotfix-1 (doesn't match search)
			expect(result).toHaveLength(2);
			expect(result.map((b) => b.getName())).toEqual(['feature-2', 'feature-3']);
		});
	});

	describe('edge cases', () => {
		test('handles empty branches array', () => {
			const result = filterSelectableBranches({
				branches: [],
				currentBranch: 'main'
			});

			expect(result).toHaveLength(0);
		});

		test('handles branches with additional properties', () => {
			const branchesWithProps: Branch[] = [
				createBranch('main', false),
				createBranch('feature-1', false)
			];

			const result = filterSelectableBranches({
				branches: branchesWithProps,
				currentBranch: 'main'
			});

			expect(result).toHaveLength(1);
			expect(result[0].getName()).toBe('feature-1');
		});
	});
});
