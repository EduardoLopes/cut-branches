import { describe, test, expect } from 'vitest';
import { getBranchAlerts, shouldShowBranchAlerts } from '../branch-utils';
import { Branch } from '$domains/branch-management/core/models/branch';
import type { Branch as BranchData } from '$infrastructure/bindings';

const createBranch = (name: string, overrides: Partial<BranchData> = {}): Branch =>
	Branch.fromData({
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
		isLocked: false,
		...overrides
	});

describe('getBranchAlerts', () => {
	test('shows the not-merged alert only when metrics report the branch as unmerged', () => {
		expect(getBranchAlerts(createBranch('feature'), false, false)).toContain('fullyMerged');
	});

	test('does not show the not-merged alert for a merged branch', () => {
		expect(getBranchAlerts(createBranch('feature'), false, true)).not.toContain('fullyMerged');
	});

	test('does not flash the not-merged alert while merge status is still unknown', () => {
		// Sync never computes `fullyMerged` (always false); unknown metrics must
		// not be read as "not merged".
		expect(getBranchAlerts(createBranch('feature'), false, undefined)).toEqual([]);
	});

	test('includes protected-words only when selected', () => {
		expect(getBranchAlerts(createBranch('main', { isSelected: true }), true, true)).toContain(
			'protectedWords'
		);
		expect(getBranchAlerts(createBranch('main'), false, true)).not.toContain('protectedWords');
	});
});

describe('shouldShowBranchAlerts', () => {
	test('is false for no alerts', () => {
		expect(shouldShowBranchAlerts([], createBranch('feature'))).toBe(false);
	});

	test('hides a lone not-merged alert on the current branch', () => {
		expect(shouldShowBranchAlerts(['fullyMerged'], createBranch('main', { current: true }))).toBe(
			false
		);
		expect(shouldShowBranchAlerts(['fullyMerged'], createBranch('feature'))).toBe(true);
	});
});
