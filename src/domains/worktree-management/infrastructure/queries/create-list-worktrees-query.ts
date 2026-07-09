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
export function createListWorktreesQuery(
	input: () => ListWorktreesInput,
	options?: TauriQueryOptions<'listWorktrees', ListWorktreesOutput>
) {
	return createTauriQuery('listWorktrees', {
		input,
		enabled: () => !!input().path,
		select: (data) => ({
			...data,
			worktrees: WorktreeConverters.fromDataArray(data.worktrees)
		}),
		...options
	});
}
