import { describe, it, expect, beforeEach } from 'vitest';
import { Branch } from '../branch';
import { Commit } from '../commit';
import { BranchConverters, CommitConverters } from '../converters';
import type { Branch as BranchData, Commit as CommitData } from '$infrastructure/bindings';

describe('Converters', () => {
	describe('BranchConverters', () => {
		let mockBranchData: BranchData;

		beforeEach(() => {
			mockBranchData = {
				name: 'feature-branch',
				fullyMerged: false,
				upstream: null,
				lastCommit: {
					sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
					shortSha: 'a1b2c3d',
					date: '2024-01-15T10:30:00.000Z',
					message: 'feat: add feature',
					summary: 'feat: add feature',
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
			it('should convert BranchData to Branch domain model', () => {
				const branch = BranchConverters.fromData(mockBranchData);

				expect(branch).toBeInstanceOf(Branch);
				expect(branch.getName()).toBe('feature-branch');
			});

			it('should preserve all branch properties', () => {
				const branch = BranchConverters.fromData(mockBranchData);

				expect(branch.isMerged()).toBe(false);
				expect(branch.isCurrent()).toBe(false);
				expect(branch.getIsSelected()).toBe(false);
				expect(branch.getIsLocked()).toBe(false);
			});
		});

		describe('toData', () => {
			it('should convert Branch domain model to BranchData', () => {
				const branch = Branch.fromData(mockBranchData);
				const data = BranchConverters.toData(branch);

				expect(data.name).toBe('feature-branch');
				expect(data.fullyMerged).toBe(false);
				expect(data.current).toBe(false);
			});

			it('should round-trip correctly', () => {
				const branch = BranchConverters.fromData(mockBranchData);
				const data = BranchConverters.toData(branch);
				const branch2 = BranchConverters.fromData(data);

				expect(branch.equals(branch2)).toBe(true);
			});
		});

		describe('fromDataArray', () => {
			it('should convert array of BranchData to Branch domain models', () => {
				const data = [mockBranchData, { ...mockBranchData, name: 'other-branch' }];
				const branches = BranchConverters.fromDataArray(data);

				expect(branches).toHaveLength(2);
				expect(branches[0]).toBeInstanceOf(Branch);
				expect(branches[1]).toBeInstanceOf(Branch);
				expect(branches[0].getName()).toBe('feature-branch');
				expect(branches[1].getName()).toBe('other-branch');
			});

			it('should handle empty array', () => {
				const branches = BranchConverters.fromDataArray([]);

				expect(branches).toEqual([]);
			});

			it('should convert single element array', () => {
				const branches = BranchConverters.fromDataArray([mockBranchData]);

				expect(branches).toHaveLength(1);
				expect(branches[0].getName()).toBe('feature-branch');
			});
		});

		describe('toDataArray', () => {
			it('should convert array of Branch domain models to BranchData', () => {
				const branches = [
					Branch.fromData(mockBranchData),
					Branch.fromData({ ...mockBranchData, name: 'other-branch' })
				];
				const data = BranchConverters.toDataArray(branches);

				expect(data).toHaveLength(2);
				expect(data[0].name).toBe('feature-branch');
				expect(data[1].name).toBe('other-branch');
			});

			it('should handle empty array', () => {
				const data = BranchConverters.toDataArray([]);

				expect(data).toEqual([]);
			});

			it('should round-trip array correctly', () => {
				const data = [mockBranchData, { ...mockBranchData, name: 'other-branch' }];
				const branches = BranchConverters.fromDataArray(data);
				const data2 = BranchConverters.toDataArray(branches);
				const branches2 = BranchConverters.fromDataArray(data2);

				expect(branches[0].equals(branches2[0])).toBe(true);
				expect(branches[1].equals(branches2[1])).toBe(true);
			});
		});
	});

	describe('CommitConverters', () => {
		let mockCommitData: CommitData;

		beforeEach(() => {
			mockCommitData = {
				sha: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
				shortSha: 'a1b2c3d',
				date: '2024-01-15T10:30:00.000Z',
				message: 'feat: add feature',
				summary: 'feat: add feature',
				author: 'John Doe',
				email: 'john.doe@example.com'
			};
		});

		describe('fromData', () => {
			it('should convert CommitData to Commit domain model', () => {
				const commit = CommitConverters.fromData(mockCommitData);

				expect(commit).toBeInstanceOf(Commit);
				expect(commit.getSha()).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
			});

			it('should preserve all commit properties', () => {
				const commit = CommitConverters.fromData(mockCommitData);

				expect(commit.getMessage()).toBe('feat: add feature');
				expect(commit.getAuthor()).toBe('John Doe');
				expect(commit.getEmail()).toBe('john.doe@example.com');
			});
		});

		describe('toData', () => {
			it('should convert Commit domain model to CommitData', () => {
				const commit = Commit.fromData(mockCommitData);
				const data = CommitConverters.toData(commit);

				expect(data.sha).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
				expect(data.message).toBe('feat: add feature');
				expect(data.author).toBe('John Doe');
			});

			it('should round-trip correctly', () => {
				const commit = CommitConverters.fromData(mockCommitData);
				const data = CommitConverters.toData(commit);
				const commit2 = CommitConverters.fromData(data);

				expect(commit.equals(commit2)).toBe(true);
			});
		});

		describe('fromDataArray', () => {
			it('should convert array of CommitData to Commit domain models', () => {
				const data = [
					mockCommitData,
					{
						...mockCommitData,
						sha: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
						message: 'fix: bug fix'
					}
				];
				const commits = CommitConverters.fromDataArray(data);

				expect(commits).toHaveLength(2);
				expect(commits[0]).toBeInstanceOf(Commit);
				expect(commits[1]).toBeInstanceOf(Commit);
				expect(commits[0].getMessage()).toBe('feat: add feature');
				expect(commits[1].getMessage()).toBe('fix: bug fix');
			});

			it('should handle empty array', () => {
				const commits = CommitConverters.fromDataArray([]);

				expect(commits).toEqual([]);
			});

			it('should convert single element array', () => {
				const commits = CommitConverters.fromDataArray([mockCommitData]);

				expect(commits).toHaveLength(1);
				expect(commits[0].getSha()).toBe('a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0');
			});
		});

		describe('toDataArray', () => {
			it('should convert array of Commit domain models to CommitData', () => {
				const commits = [
					Commit.fromData(mockCommitData),
					Commit.fromData({
						...mockCommitData,
						sha: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
						message: 'fix: bug fix'
					})
				];
				const data = CommitConverters.toDataArray(commits);

				expect(data).toHaveLength(2);
				expect(data[0].message).toBe('feat: add feature');
				expect(data[1].message).toBe('fix: bug fix');
			});

			it('should handle empty array', () => {
				const data = CommitConverters.toDataArray([]);

				expect(data).toEqual([]);
			});

			it('should round-trip array correctly', () => {
				const data = [
					mockCommitData,
					{
						...mockCommitData,
						sha: 'b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1',
						message: 'fix: bug fix'
					}
				];
				const commits = CommitConverters.fromDataArray(data);
				const data2 = CommitConverters.toDataArray(commits);
				const commits2 = CommitConverters.fromDataArray(data2);

				expect(commits[0].equals(commits2[0])).toBe(true);
				expect(commits[1].equals(commits2[1])).toBe(true);
			});
		});
	});
});
