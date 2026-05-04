import { Branch } from './branch';
import { Commit } from './commit';
import type { Branch as BranchData, Commit as CommitData } from '$infrastructure/bindings';

/**
 * Conversion utilities for transforming between data types and domain models.
 * These utilities centralize the conversion logic for batch operations.
 */

/**
 * Branch conversion utilities
 */
export const BranchConverters = {
	/**
	 * Converts a single BranchData to Branch domain model
	 * @param data - The branch data from Tauri
	 * @returns Branch domain model
	 */
	fromData: (data: BranchData): Branch => {
		return Branch.fromData(data);
	},

	/**
	 * Converts a Branch domain model back to BranchData
	 * @param branch - The Branch domain model
	 * @returns BranchData
	 */
	toData: (branch: Branch): BranchData => {
		return branch.toData();
	},

	/**
	 * Converts an array of BranchData to Branch domain models
	 * @param data - Array of branch data from Tauri
	 * @returns Array of Branch domain models
	 */
	fromDataArray: (data: BranchData[]): Branch[] => {
		return data.map(Branch.fromData);
	},

	/**
	 * Converts an array of Branch domain models back to BranchData
	 * @param branches - Array of Branch domain models
	 * @returns Array of BranchData
	 */
	toDataArray: (branches: Branch[]): BranchData[] => {
		return branches.map((b) => b.toData());
	}
} as const;

/**
 * Commit conversion utilities
 */
export const CommitConverters = {
	/**
	 * Converts a single CommitData to Commit domain model
	 * @param data - The commit data from Tauri
	 * @returns Commit domain model
	 */
	fromData: (data: CommitData): Commit => {
		return Commit.fromData(data);
	},

	/**
	 * Converts a Commit domain model back to CommitData
	 * @param commit - The Commit domain model
	 * @returns CommitData
	 */
	toData: (commit: Commit): CommitData => {
		return commit.toData();
	},

	/**
	 * Converts an array of CommitData to Commit domain models
	 * @param data - Array of commit data from Tauri
	 * @returns Array of Commit domain models
	 */
	fromDataArray: (data: CommitData[]): Commit[] => {
		return data.map(Commit.fromData);
	},

	/**
	 * Converts an array of Commit domain models back to CommitData
	 * @param commits - Array of Commit domain models
	 * @returns Array of CommitData
	 */
	toDataArray: (commits: Commit[]): CommitData[] => {
		return commits.map((c) => c.toData());
	}
} as const;
