import type { Branch } from '../../core/models/branch';
import { BranchConverters } from '../../core/models/converters';
import type { GetRepositoryOutput as GetRepositoryOutputData } from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

// Repository output type with Domain Model branches
export interface GetRepositoryOutput extends Omit<GetRepositoryOutputData, 'branches'> {
	branches: Branch[];
}

// Module-scoped so every observer shares one `select` identity. TanStack
// memoizes the select result per observer on (data, select) — an inline arrow
// is a fresh identity on every options re-evaluation, which rebuilt a Branch
// instance for *every* branch in the repository on each re-render. Same fix as
// `create-get-branches-query`.
const selectRepository = (data: GetRepositoryOutputData): GetRepositoryOutput => ({
	...data,
	branches: BranchConverters.fromDataArray(data.branches)
});

export function createGetRepositoryQuery(
	id: () => string | undefined,
	options?: TauriQueryOptions<'getRepository', GetRepositoryOutput>
) {
	return createTauriQuery('getRepository', {
		input: () => ({ id: id() ?? '' }),
		enabled: () => !!id(),
		select: selectRepository,
		...options
	});
}
