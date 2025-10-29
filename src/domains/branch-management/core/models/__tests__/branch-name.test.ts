import { describe, it, expect } from 'vitest';
import { BranchName } from '../branch-name';

describe('BranchName', () => {
	describe('constructor', () => {
		it('should create a BranchName with a valid simple name', () => {
			const name = 'main';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with hyphens', () => {
			const name = 'feature-branch';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with underscores', () => {
			const name = 'feature_branch';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with slashes for hierarchy', () => {
			const name = 'feature/new-feature';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with numbers', () => {
			const name = 'feature-123';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with dots in the middle', () => {
			const name = 'release-1.0.0';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should create a BranchName with multiple hierarchical levels', () => {
			const name = 'feature/team/new-feature';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should trim whitespace from the branch name', () => {
			const name = '  feature-branch  ';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe('feature-branch');
		});

		it('should throw an error for an empty string', () => {
			expect(() => new BranchName('')).toThrow(
				'Invalid branch name: "". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a whitespace-only string', () => {
			expect(() => new BranchName('   ')).toThrow(
				'Invalid branch name: "   ". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name starting with a dot', () => {
			expect(() => new BranchName('.feature')).toThrow(
				'Invalid branch name: ".feature". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name ending with a dot', () => {
			expect(() => new BranchName('feature.')).toThrow(
				'Invalid branch name: "feature.". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name ending with .lock', () => {
			expect(() => new BranchName('feature.lock')).toThrow(
				'Invalid branch name: "feature.lock". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name starting with a slash', () => {
			expect(() => new BranchName('/feature')).toThrow(
				'Invalid branch name: "/feature". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name ending with a slash', () => {
			expect(() => new BranchName('feature/')).toThrow(
				'Invalid branch name: "feature/". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name containing consecutive dots', () => {
			expect(() => new BranchName('feature..branch')).toThrow(
				'Invalid branch name: "feature..branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with null byte', () => {
			expect(() => new BranchName('feature\x00branch')).toThrow(
				'Invalid branch name: "feature\x00branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with control character', () => {
			expect(() => new BranchName('feature\x1fbranch')).toThrow(
				'Invalid branch name: "feature\x1fbranch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with space', () => {
			expect(() => new BranchName('feature branch')).toThrow(
				'Invalid branch name: "feature branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with tilde', () => {
			expect(() => new BranchName('feature~branch')).toThrow(
				'Invalid branch name: "feature~branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with caret', () => {
			expect(() => new BranchName('feature^branch')).toThrow(
				'Invalid branch name: "feature^branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with colon', () => {
			expect(() => new BranchName('feature:branch')).toThrow(
				'Invalid branch name: "feature:branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with question mark', () => {
			expect(() => new BranchName('feature?branch')).toThrow(
				'Invalid branch name: "feature?branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with asterisk', () => {
			expect(() => new BranchName('feature*branch')).toThrow(
				'Invalid branch name: "feature*branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with open bracket', () => {
			expect(() => new BranchName('feature[branch')).toThrow(
				'Invalid branch name: "feature[branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with close bracket', () => {
			expect(() => new BranchName('feature]branch')).toThrow(
				'Invalid branch name: "feature]branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with backslash', () => {
			expect(() => new BranchName('feature\\branch')).toThrow(
				'Invalid branch name: "feature\\branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name that is just "@"', () => {
			expect(() => new BranchName('@')).toThrow(
				'Invalid branch name: "@". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name containing "@{"', () => {
			expect(() => new BranchName('feature@{branch')).toThrow(
				'Invalid branch name: "feature@{branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should throw an error for a branch name with consecutive slashes', () => {
			expect(() => new BranchName('feature//branch')).toThrow(
				'Invalid branch name: "feature//branch". Branch names must be non-empty and follow Git naming rules.'
			);
		});

		it('should allow @ in other contexts', () => {
			const name = 'feature@v1';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});
	});

	describe('getValue', () => {
		it('should return the branch name value', () => {
			const name = 'feature-branch';
			const branchName = new BranchName(name);

			expect(branchName.getValue()).toBe(name);
		});

		it('should return trimmed branch name', () => {
			const branchName = new BranchName('  feature-branch  ');

			expect(branchName.getValue()).toBe('feature-branch');
		});
	});

	describe('isProtected', () => {
		it('should return true for "main"', () => {
			const branchName = new BranchName('main');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "master"', () => {
			const branchName = new BranchName('master');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "develop"', () => {
			const branchName = new BranchName('develop');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "dev"', () => {
			const branchName = new BranchName('dev');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "staging"', () => {
			const branchName = new BranchName('staging');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "stg"', () => {
			const branchName = new BranchName('stg');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "hml"', () => {
			const branchName = new BranchName('hml');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "default"', () => {
			const branchName = new BranchName('default');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return true for "trunk"', () => {
			const branchName = new BranchName('trunk');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should be case-insensitive for protected names', () => {
			const branchName = new BranchName('MAIN');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should be case-insensitive for mixed case', () => {
			const branchName = new BranchName('MaIn');

			expect(branchName.isProtected()).toBe(true);
		});

		it('should return false for non-protected branch', () => {
			const branchName = new BranchName('feature-branch');

			expect(branchName.isProtected()).toBe(false);
		});

		it('should return false for branch containing protected name as substring', () => {
			const branchName = new BranchName('feature-main-branch');

			expect(branchName.isProtected()).toBe(false);
		});
	});

	describe('isPotentiallyOffensive', () => {
		it('should return true for "master"', () => {
			const branchName = new BranchName('master');

			expect(branchName.isPotentiallyOffensive()).toBe(true);
		});

		it('should be case-insensitive for offensive names', () => {
			const branchName = new BranchName('MASTER');

			expect(branchName.isPotentiallyOffensive()).toBe(true);
		});

		it('should be case-insensitive for mixed case', () => {
			const branchName = new BranchName('MaStEr');

			expect(branchName.isPotentiallyOffensive()).toBe(true);
		});

		it('should return false for non-offensive branch', () => {
			const branchName = new BranchName('main');

			expect(branchName.isPotentiallyOffensive()).toBe(false);
		});

		it('should return false for branch containing offensive name as substring', () => {
			const branchName = new BranchName('webmaster');

			expect(branchName.isPotentiallyOffensive()).toBe(false);
		});
	});

	describe('equals', () => {
		it('should return true for identical branch names', () => {
			const name = 'feature-branch';
			const branchName1 = new BranchName(name);
			const branchName2 = new BranchName(name);

			expect(branchName1.equals(branchName2)).toBe(true);
		});

		it('should return true for branch names with different whitespace (trimmed)', () => {
			const branchName1 = new BranchName('feature-branch');
			const branchName2 = new BranchName('  feature-branch  ');

			expect(branchName1.equals(branchName2)).toBe(true);
		});

		it('should return false for different branch names', () => {
			const branchName1 = new BranchName('feature-branch');
			const branchName2 = new BranchName('bugfix-branch');

			expect(branchName1.equals(branchName2)).toBe(false);
		});

		it('should be case-sensitive in comparison', () => {
			const branchName1 = new BranchName('feature-branch');
			const branchName2 = new BranchName('FEATURE-BRANCH');

			expect(branchName1.equals(branchName2)).toBe(false);
		});

		it('should return false for similar but different names', () => {
			const branchName1 = new BranchName('feature-branch');
			const branchName2 = new BranchName('feature-branch-2');

			expect(branchName1.equals(branchName2)).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the branch name value', () => {
			const name = 'feature-branch';
			const branchName = new BranchName(name);

			expect(branchName.toString()).toBe(name);
		});

		it('should return trimmed branch name', () => {
			const branchName = new BranchName('  feature-branch  ');

			expect(branchName.toString()).toBe('feature-branch');
		});
	});
});
