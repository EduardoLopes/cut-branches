import { describe, test, expect } from 'vitest';
import { matchesRepositoryChange } from '../query-key-utils';

const REPO = 'repo-1';

describe('matchesRepositoryChange', () => {
	test('matches the branch list for the changed repository', () => {
		expect(matchesRepositoryChange(['branch', 'getBranchList', { repoId: REPO }], REPO)).toBe(true);
	});

	test('does not match the branch list for another repository', () => {
		expect(matchesRepositoryChange(['branch', 'getBranchList', { repoId: 'other' }], REPO)).toBe(
			false
		);
	});

	test('does not match a branch list query with no repoId input', () => {
		expect(matchesRepositoryChange(['branch', 'getBranchList', null], REPO)).toBe(false);
	});

	test('matches the repository record for the changed repository', () => {
		expect(matchesRepositoryChange(['repository', 'getRepository', { id: REPO }], REPO)).toBe(true);
	});

	test('does not match the repository record for another repository', () => {
		expect(matchesRepositoryChange(['repository', 'getRepository', { id: 'other' }], REPO)).toBe(
			false
		);
	});

	test('does not match a repository record with null input', () => {
		expect(matchesRepositoryChange(['repository', 'getRepository', null], REPO)).toBe(false);
	});

	test('does not match a repository record without an id field', () => {
		expect(matchesRepositoryChange(['repository', 'getRepository', { path: '/p' }], REPO)).toBe(
			false
		);
	});

	test('always matches the repository list (sidebar counts)', () => {
		expect(matchesRepositoryChange(['repository', 'getRepositoryList'], REPO)).toBe(true);
	});

	test('does not match unrelated resources', () => {
		expect(matchesRepositoryChange(['locked-branches', 'listLockedBranches', {}], REPO)).toBe(
			false
		);
	});

	test('matches commit-history queries keyed with the changed repoId', () => {
		expect(
			matchesRepositoryChange(
				['commit-history', 'listCommitHistory', { repoId: REPO, path: '/p' }],
				REPO
			)
		).toBe(true);
		expect(
			matchesRepositoryChange(
				['commit-history-window', 'getCommitHistoryWindow', { repoId: REPO, path: '/p' }],
				REPO
			)
		).toBe(true);
		expect(
			matchesRepositoryChange(
				['branch-comparison', 'listBranchComparison', { repoId: REPO, path: '/p' }],
				REPO
			)
		).toBe(true);
	});

	test('does not match commit-history queries for another repo or without repoId', () => {
		expect(
			matchesRepositoryChange(
				['commit-history', 'listCommitHistory', { repoId: 'other', path: '/p' }],
				REPO
			)
		).toBe(false);
		expect(
			matchesRepositoryChange(['branch-comparison', 'listBranchComparison', { path: '/p' }], REPO)
		).toBe(false);
	});
});
