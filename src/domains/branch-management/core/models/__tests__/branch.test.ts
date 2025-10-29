import { describe, it, expect } from 'vitest';
import { Branch, type BranchAlert } from '../branch';
import type { Branch as BranchData } from '$lib/bindings';

describe('Branch', () => {
	let mockBranchData: BranchData;

	beforeEach(() => {
		mockBranchData = {
			name: 'feature-branch',
			fullyMerged: false,
			lastCommit: {
				sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
				shortSha: 'a1b2c3d',
				date: '2024-01-15T10:30:00.000Z',
				message: 'feat: add feature',
				author: 'John Doe',
				email: 'john.doe@example.com'
			},
			current: false,
			deletedAt: null,
			isReachable: true,
			isSelected: false,
			isLocked: false
		};
	});

	describe('fromData', () => {
		it('should create a Branch from valid data', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getName()).toBe('feature-branch');
			expect(branch.isMerged()).toBe(false);
			expect(branch.isCurrent()).toBe(false);
			expect(branch.getIsSelected()).toBe(false);
			expect(branch.getIsLocked()).toBe(false);
		});

		it('should create BranchName value object', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getName()).toBe(mockBranchData.name);
		});

		it('should create Commit domain model', () => {
			const branch = Branch.fromData(mockBranchData);
			const commit = branch.getLastCommit();

			expect(commit.getSha()).toBe(mockBranchData.lastCommit.sha);
			expect(commit.getMessage()).toBe(mockBranchData.lastCommit.message);
		});

		it('should handle null deletedAt', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getDeletedAt()).toBeNull();
			expect(branch.isDeleted()).toBe(false);
		});

		it('should parse deletedAt as Date', () => {
			const data = { ...mockBranchData, deletedAt: '2024-01-16T10:30:00.000Z' };
			const branch = Branch.fromData(data);

			expect(branch.getDeletedAt()).toEqual(new Date('2024-01-16T10:30:00.000Z'));
			expect(branch.isDeleted()).toBe(true);
		});

		it('should handle null isReachable', () => {
			const data = { ...mockBranchData, isReachable: null };
			const branch = Branch.fromData(data);

			expect(branch.getIsReachable()).toBeNull();
		});

		it('should throw error for invalid branch name', () => {
			const invalidData = { ...mockBranchData, name: '' };

			expect(() => Branch.fromData(invalidData)).toThrow();
		});
	});

	describe('toData', () => {
		it('should convert Branch back to data object', () => {
			const branch = Branch.fromData(mockBranchData);
			const data = branch.toData();

			expect(data.name).toBe(mockBranchData.name);
			expect(data.fullyMerged).toBe(mockBranchData.fullyMerged);
			expect(data.current).toBe(mockBranchData.current);
			expect(data.isSelected).toBe(mockBranchData.isSelected);
			expect(data.isLocked).toBe(mockBranchData.isLocked);
		});

		it('should convert deletedAt to ISO string', () => {
			const data = { ...mockBranchData, deletedAt: '2024-01-16T10:30:00.000Z' };
			const branch = Branch.fromData(data);
			const result = branch.toData();

			expect(result.deletedAt).toBe('2024-01-16T10:30:00.000Z');
		});

		it('should preserve null deletedAt', () => {
			const branch = Branch.fromData(mockBranchData);
			const data = branch.toData();

			expect(data.deletedAt).toBeNull();
		});

		it('should round-trip correctly', () => {
			const branch = Branch.fromData(mockBranchData);
			const data = branch.toData();
			const branch2 = Branch.fromData(data);

			expect(branch.equals(branch2)).toBe(true);
		});
	});

	describe('getName', () => {
		it('should return the branch name', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getName()).toBe('feature-branch');
		});
	});

	describe('isMerged', () => {
		it('should return true for merged branch', () => {
			const data = { ...mockBranchData, fullyMerged: true };
			const branch = Branch.fromData(data);

			expect(branch.isMerged()).toBe(true);
		});

		it('should return false for unmerged branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isMerged()).toBe(false);
		});
	});

	describe('getLastCommit', () => {
		it('should return the Commit domain model', () => {
			const branch = Branch.fromData(mockBranchData);
			const commit = branch.getLastCommit();

			expect(commit.getSha()).toBe(mockBranchData.lastCommit.sha);
		});
	});

	describe('isCurrent', () => {
		it('should return true for current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);

			expect(branch.isCurrent()).toBe(true);
		});

		it('should return false for non-current branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isCurrent()).toBe(false);
		});
	});

	describe('getDeletedAt', () => {
		it('should return null for non-deleted branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getDeletedAt()).toBeNull();
		});

		it('should return Date for deleted branch', () => {
			const data = { ...mockBranchData, deletedAt: '2024-01-16T10:30:00.000Z' };
			const branch = Branch.fromData(data);

			expect(branch.getDeletedAt()).toEqual(new Date('2024-01-16T10:30:00.000Z'));
		});
	});

	describe('isDeleted', () => {
		it('should return false for non-deleted branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isDeleted()).toBe(false);
		});

		it('should return true for deleted branch', () => {
			const data = { ...mockBranchData, deletedAt: '2024-01-16T10:30:00.000Z' };
			const branch = Branch.fromData(data);

			expect(branch.isDeleted()).toBe(true);
		});
	});

	describe('getIsReachable', () => {
		it('should return true for reachable branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getIsReachable()).toBe(true);
		});

		it('should return false for unreachable branch', () => {
			const data = { ...mockBranchData, isReachable: false };
			const branch = Branch.fromData(data);

			expect(branch.getIsReachable()).toBe(false);
		});

		it('should return null for unknown reachability', () => {
			const data = { ...mockBranchData, isReachable: null };
			const branch = Branch.fromData(data);

			expect(branch.getIsReachable()).toBeNull();
		});
	});

	describe('getIsSelected', () => {
		it('should return true for selected branch', () => {
			const data = { ...mockBranchData, isSelected: true };
			const branch = Branch.fromData(data);

			expect(branch.getIsSelected()).toBe(true);
		});

		it('should return false for unselected branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getIsSelected()).toBe(false);
		});
	});

	describe('getIsLocked', () => {
		it('should return true for locked branch', () => {
			const data = { ...mockBranchData, isLocked: true };
			const branch = Branch.fromData(data);

			expect(branch.getIsLocked()).toBe(true);
		});

		it('should return false for unlocked branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getIsLocked()).toBe(false);
		});
	});

	describe('isProtected', () => {
		it('should return true for main branch', () => {
			const data = { ...mockBranchData, name: 'main' };
			const branch = Branch.fromData(data);

			expect(branch.isProtected()).toBe(true);
		});

		it('should return true for master branch', () => {
			const data = { ...mockBranchData, name: 'master' };
			const branch = Branch.fromData(data);

			expect(branch.isProtected()).toBe(true);
		});

		it('should return true for develop branch', () => {
			const data = { ...mockBranchData, name: 'develop' };
			const branch = Branch.fromData(data);

			expect(branch.isProtected()).toBe(true);
		});

		it('should return false for feature branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isProtected()).toBe(false);
		});
	});

	describe('isPotentiallyOffensive', () => {
		it('should return true for master branch', () => {
			const data = { ...mockBranchData, name: 'master' };
			const branch = Branch.fromData(data);

			expect(branch.isPotentiallyOffensive()).toBe(true);
		});

		it('should return false for main branch', () => {
			const data = { ...mockBranchData, name: 'main' };
			const branch = Branch.fromData(data);

			expect(branch.isPotentiallyOffensive()).toBe(false);
		});

		it('should return false for feature branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isPotentiallyOffensive()).toBe(false);
		});
	});

	describe('isSelectable', () => {
		it('should return true for non-current, unlocked branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isSelectable()).toBe(true);
		});

		it('should return false for current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);

			expect(branch.isSelectable()).toBe(false);
		});

		it('should return false for locked branch', () => {
			const data = { ...mockBranchData, isLocked: true };
			const branch = Branch.fromData(data);

			expect(branch.isSelectable()).toBe(false);
		});

		it('should return false for current and locked branch', () => {
			const data = { ...mockBranchData, current: true, isLocked: true };
			const branch = Branch.fromData(data);

			expect(branch.isSelectable()).toBe(false);
		});
	});

	describe('isDeletable', () => {
		it('should return true for non-current, unlocked branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.isDeletable()).toBe(true);
		});

		it('should return false for current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);

			expect(branch.isDeletable()).toBe(false);
		});

		it('should return false for locked branch', () => {
			const data = { ...mockBranchData, isLocked: true };
			const branch = Branch.fromData(data);

			expect(branch.isDeletable()).toBe(false);
		});
	});

	describe('getAlerts', () => {
		it('should return fullyMerged alert for unmerged branch', () => {
			const branch = Branch.fromData(mockBranchData);
			const alerts = branch.getAlerts();

			expect(alerts).toContain('fullyMerged');
		});

		it('should not return fullyMerged alert for merged branch', () => {
			const data = { ...mockBranchData, fullyMerged: true };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).not.toContain('fullyMerged');
		});

		it('should use override mergeStatus when provided', () => {
			const branch = Branch.fromData(mockBranchData);
			const alerts = branch.getAlerts(true);

			expect(alerts).not.toContain('fullyMerged');
		});

		it('should return protectedWords alert for selected protected branch', () => {
			const data = { ...mockBranchData, name: 'main', isSelected: true };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).toContain('protectedWords');
		});

		it('should not return protectedWords alert for unselected protected branch', () => {
			const data = { ...mockBranchData, name: 'main', isSelected: false };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).not.toContain('protectedWords');
		});

		it('should return offensiveWords alert for offensive branch', () => {
			const data = { ...mockBranchData, name: 'master' };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).toContain('offensiveWords');
		});

		it('should return multiple alerts when applicable', () => {
			const data = { ...mockBranchData, name: 'master', isSelected: true };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).toContain('fullyMerged');
			expect(alerts).toContain('protectedWords');
			expect(alerts).toContain('offensiveWords');
		});

		it('should return empty array for merged, non-protected, non-offensive branch', () => {
			const data = { ...mockBranchData, fullyMerged: true };
			const branch = Branch.fromData(data);
			const alerts = branch.getAlerts();

			expect(alerts).toEqual([]);
		});
	});

	describe('shouldShowAlerts', () => {
		it('should return false for empty alerts array', () => {
			const branch = Branch.fromData(mockBranchData);
			const alerts: BranchAlert[] = [];

			expect(branch.shouldShowAlerts(alerts)).toBe(false);
		});

		it('should return true for non-empty alerts', () => {
			const branch = Branch.fromData(mockBranchData);
			const alerts = ['fullyMerged' as const];

			expect(branch.shouldShowAlerts(alerts)).toBe(true);
		});

		it('should return false for only fullyMerged alert on current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);
			const alerts = ['fullyMerged' as const];

			expect(branch.shouldShowAlerts(alerts)).toBe(false);
		});

		it('should return true for fullyMerged alert on non-current branch', () => {
			const branch = Branch.fromData(mockBranchData);
			const alerts = ['fullyMerged' as const];

			expect(branch.shouldShowAlerts(alerts)).toBe(true);
		});

		it('should return true for multiple alerts including fullyMerged on current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);
			const alerts = ['fullyMerged' as const, 'offensiveWords' as const];

			expect(branch.shouldShowAlerts(alerts)).toBe(true);
		});
	});

	describe('getColorPalette', () => {
		it('should return danger for selected branch', () => {
			const data = { ...mockBranchData, isSelected: true };
			const branch = Branch.fromData(data);

			expect(branch.getColorPalette()).toBe('danger');
		});

		it('should return primary for current branch', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);

			expect(branch.getColorPalette()).toBe('primary');
		});

		it('should return neutral for regular branch', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getColorPalette()).toBe('neutral');
		});

		it('should prioritize selected over current', () => {
			const data = { ...mockBranchData, current: true, isSelected: true };
			const branch = Branch.fromData(data);

			expect(branch.getColorPalette()).toBe('danger');
		});

		it('should use override selected parameter', () => {
			const branch = Branch.fromData(mockBranchData);

			expect(branch.getColorPalette(true)).toBe('danger');
			expect(branch.getColorPalette(false)).toBe('neutral');
		});
	});

	describe('withSelection', () => {
		it('should return new Branch with updated selection', () => {
			const branch = Branch.fromData(mockBranchData);
			const updated = branch.withSelection(true);

			expect(updated.getIsSelected()).toBe(true);
			expect(branch.getIsSelected()).toBe(false); // Original unchanged
		});

		it('should preserve all other properties', () => {
			const branch = Branch.fromData(mockBranchData);
			const updated = branch.withSelection(true);

			expect(updated.getName()).toBe(branch.getName());
			expect(updated.isMerged()).toBe(branch.isMerged());
			expect(updated.isCurrent()).toBe(branch.isCurrent());
			expect(updated.getIsLocked()).toBe(branch.getIsLocked());
		});

		it('should be immutable', () => {
			const branch = Branch.fromData(mockBranchData);
			branch.withSelection(true);

			expect(branch.getIsSelected()).toBe(false);
		});
	});

	describe('withLock', () => {
		it('should return new Branch with updated lock status', () => {
			const branch = Branch.fromData(mockBranchData);
			const updated = branch.withLock(true);

			expect(updated.getIsLocked()).toBe(true);
			expect(branch.getIsLocked()).toBe(false); // Original unchanged
		});

		it('should preserve all other properties', () => {
			const branch = Branch.fromData(mockBranchData);
			const updated = branch.withLock(true);

			expect(updated.getName()).toBe(branch.getName());
			expect(updated.isMerged()).toBe(branch.isMerged());
			expect(updated.isCurrent()).toBe(branch.isCurrent());
			expect(updated.getIsSelected()).toBe(branch.getIsSelected());
		});

		it('should be immutable', () => {
			const branch = Branch.fromData(mockBranchData);
			branch.withLock(true);

			expect(branch.getIsLocked()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for branches with same name', () => {
			const branch1 = Branch.fromData(mockBranchData);
			const branch2 = Branch.fromData(mockBranchData);

			expect(branch1.equals(branch2)).toBe(true);
		});

		it('should return false for branches with different names', () => {
			const branch1 = Branch.fromData(mockBranchData);
			const data2 = { ...mockBranchData, name: 'other-branch' };
			const branch2 = Branch.fromData(data2);

			expect(branch1.equals(branch2)).toBe(false);
		});

		it('should return true even if other properties differ', () => {
			const branch1 = Branch.fromData(mockBranchData);
			const data2 = {
				...mockBranchData,
				current: true,
				isSelected: true,
				fullyMerged: true
			};
			const branch2 = Branch.fromData(data2);

			expect(branch1.equals(branch2)).toBe(true);
		});
	});

	describe('toString', () => {
		it('should return name for regular branch', () => {
			const branch = Branch.fromData(mockBranchData);
			const str = branch.toString();

			expect(str).toBe('feature-branch');
		});

		it('should include current flag', () => {
			const data = { ...mockBranchData, current: true };
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('current');
		});

		it('should include merged flag', () => {
			const data = { ...mockBranchData, fullyMerged: true };
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('merged');
		});

		it('should include selected flag', () => {
			const data = { ...mockBranchData, isSelected: true };
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('selected');
		});

		it('should include locked flag', () => {
			const data = { ...mockBranchData, isLocked: true };
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('locked');
		});

		it('should include deleted flag', () => {
			const data = { ...mockBranchData, deletedAt: '2024-01-16T10:30:00.000Z' };
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('deleted');
		});

		it('should include multiple flags', () => {
			const data = {
				...mockBranchData,
				current: true,
				fullyMerged: true,
				isSelected: true
			};
			const branch = Branch.fromData(data);
			const str = branch.toString();

			expect(str).toContain('current');
			expect(str).toContain('merged');
			expect(str).toContain('selected');
		});
	});
});
