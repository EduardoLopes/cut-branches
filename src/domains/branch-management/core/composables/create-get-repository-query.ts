import type { Branch } from '../models/branch';
import { BranchConverters } from '../models/converters';
import type { GetRepositoryOutput as GetRepositoryOutputData } from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$utils/create-tauri-query';

// Repository output type with Domain Model branches
export interface GetRepositoryOutput extends Omit<GetRepositoryOutputData, 'branches'> {
	branches: Branch[];
}

export function createGetRepositoryQuery(
	id: () => string | undefined,
	options?: TauriQueryOptions<'getRepository', GetRepositoryOutput>
) {
	return createTauriQuery('getRepository', {
		input: () => ({ id: id() ?? '' }),
		enabled: !!id(),
		select: (data) => ({
			...data,
			branches: BranchConverters.fromDataArray(data.branches)
		}),
		...options
	});
}
