import { type Branch } from '$domains/branch-management/core/models/branch';
import { BranchConverters } from '$domains/branch-management/core/models/converters';
import type { Repository } from '$types/repository';

export interface RepositorySource {
	id: string;
	name?: string;
	currentBranch?: string;
	path?: string;
}

export interface BranchesData {
	branches: Branch[];
}

/**
 * Builds a Repository object from query data
 *
 * @param source - Source repository data
 * @param branchesData - Branches data from query (with Domain Models)
 * @returns Repository object or undefined if branchesData is missing
 */
export function buildRepositoryData(
	source: RepositorySource | undefined,
	branchesData: BranchesData | undefined
): Repository | undefined {
	if (!source || !branchesData) {
		return undefined;
	}

	return {
		id: source.id,
		name: source.name ?? '',
		currentBranch: source.currentBranch ?? '',
		path: source.path ?? '',
		branchesCount: branchesData.branches.length,
		branches: BranchConverters.toDataArray(branchesData.branches)
	} as Repository;
}
