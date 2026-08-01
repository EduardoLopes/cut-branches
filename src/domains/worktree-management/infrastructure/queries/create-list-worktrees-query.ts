import { WorktreeConverters } from '../../core/models/converters';
import { type Worktree } from '../../core/models/worktree';
import type {
	ListWorktreesInput,
	ListWorktreesOutput as ListWorktreesOutputData
} from '$infrastructure/bindings';
import { createTauriQuery, type TauriQueryOptions } from '$infrastructure/create-tauri-query';

/** Output with domain models instead of wire DTOs. */
export interface ListWorktreesOutput extends Omit<ListWorktreesOutputData, 'worktrees'> {
	worktrees: Worktree[];
}

/**
 * Server-state adapter (§1.2): lists a repository's worktrees, mapping the wire
 * DTOs into domain models. Disabled until a repository path is available.
 */
// Module-scoped so every observer shares one `select` identity — TanStack
// memoizes the select result on (data, select), so an inline arrow rebuilds
// every Worktree model on each options re-evaluation. Both the worktrees view
// and the header's count badge observe this query, so it re-evaluates often.
const selectWorktrees = (data: ListWorktreesOutputData): ListWorktreesOutput => ({
	...data,
	worktrees: WorktreeConverters.fromDataArray(data.worktrees)
});

export function createListWorktreesQuery(
	input: () => ListWorktreesInput,
	options?: TauriQueryOptions<'listWorktrees', ListWorktreesOutput>
) {
	return createTauriQuery('listWorktrees', {
		input,
		enabled: () => !!input().path,
		select: selectWorktrees,
		...options
	});
}
