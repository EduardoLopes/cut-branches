import { type Branch } from '../../core/models/branch';
import { BranchConverters } from '../../core/models/converters';
import type {
	GetBranchListInput,
	GetBranchListOutput as GetBranchListOutputData
} from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

// Output type with Domain Models instead of Data types
export interface GetBranchListOutput extends Omit<GetBranchListOutputData, 'branches'> {
	branches: Branch[];
}

// Module-scoped so every observer shares one `select` identity: TanStack
// memoizes the select result per observer on (data, select) — a stable
// reference means the Branch class instances are rebuilt only when the data
// actually changes, not on every re-render or options re-evaluation.
const selectBranches = (data: GetBranchListOutputData): GetBranchListOutput => ({
	...data,
	branches: BranchConverters.fromDataArray(data.branches)
});

export function createGetBranchesQuery(
	input: () => GetBranchListInput,
	options?: TauriQueryOptions<'getBranchList', GetBranchListOutput>
) {
	return createTauriQuery('getBranchList', {
		input,
		enabled: () => !!input().repoId,
		select: selectBranches,
		...options
	});
}
