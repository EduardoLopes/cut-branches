import { type Branch } from '../models/branch';
import { BranchConverters } from '../models/converters';
import type {
	GetBranchListInput,
	GetBranchListOutput as GetBranchListOutputData
} from '$lib/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

// Output type with Domain Models instead of Data types
export interface GetBranchListOutput extends Omit<GetBranchListOutputData, 'branches'> {
	branches: Branch[];
}

export function createGetBranchesQuery(
	input: () => GetBranchListInput,
	options?: TauriQueryOptions<'getBranchList', GetBranchListOutput>
) {
	return createTauriQuery('getBranchList', {
		input,
		enabled: () => !!input().repoId,
		select: (data) => ({
			...data,
			branches: BranchConverters.fromDataArray(data.branches)
		}),
		...options
	});
}
