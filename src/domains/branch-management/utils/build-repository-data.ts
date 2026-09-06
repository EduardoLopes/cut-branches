import { type Branch } from '$domains/branch-management/core/models/branch';
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
		// Domain models, passed straight through. This used to call
		// `BranchConverters.toDataArray`, converting the whole list *back* to
		// wire DTOs on every recomputation — the derivation re-runs on any
		// branch change, and no consumer of `Repository` reads this field
		// (they use id/name/currentBranch/path). `RepositorySchema` types it
		// as `z.any()[]`, so the shape stays valid either way.
		branches: branchesData.branches
	} as Repository;
}
