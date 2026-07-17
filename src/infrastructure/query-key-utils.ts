import { hasRepoId } from './query-type-guards';
import type { CommandName } from './tauri-commands';

/**
 * Convert PascalCase to kebab-case
 * Examples: SelectedBranches → selected-branches, CurrentBranch → current-branch
 */
function toKebabCase(str: string): string {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

/**
 * Extract resource name from command name by removing CRUD prefixes and suffixes
 * Following the naming convention from CLAUDE.md:
 * - get, list, create, update, delete, batch (prefixes)
 * - List (suffix for collection queries like getRepositoryList)
 *
 * IMPORTANT: Compound prefixes (batchDelete, batchCreate, deleteAll) must be checked FIRST
 * before simple prefixes (batch, delete, etc.) to avoid partial matches
 */
export function extractResource(commandName: CommandName): string {
	// Remove CRUD prefixes - COMPOUND PREFIXES FIRST, THEN SIMPLE ONES
	let withoutPrefix = commandName
		// Compound prefixes (most specific)
		.replace(/^batchDelete/, '')
		.replace(/^batchCreate/, '')
		.replace(/^deleteAll/, '')
		// Simple prefixes (least specific)
		.replace(/^batch/, '')
		.replace(/^delete/, '')
		.replace(/^create/, '')
		.replace(/^update/, '')
		.replace(/^list/, '')
		.replace(/^get/, '');

	// Remove 'List' suffix for collection queries (e.g., getRepositoryList → Repository → repository)
	withoutPrefix = withoutPrefix.replace(/List$/, '');

	return toKebabCase(withoutPrefix);
}

/**
 * Special case mappings for commands that affect multiple resources
 * For example, updateCurrentBranch updates repository state
 * Values can be a single string or an array of strings for multi-resource invalidation
 */
const RESOURCE_MAPPINGS: Partial<Record<CommandName, CommandName[]>> = {
	// Branch mutations change refs, so the commit-history walk, its windows,
	// and the ahead/behind comparisons all go stale alongside the branch list.
	updateCurrentBranch: [
		'getRepository',
		'getBranchList',
		'listCommitHistory',
		'getCommitHistoryWindow',
		'listBranchComparison'
	],
	createBranchRestoration: [
		'getRepository',
		'getBranchList',
		'listCommitHistory',
		'getCommitHistoryWindow',
		'listBranchComparison'
	],
	batchCreateBranchRestorations: [
		'getRepository',
		'getBranchList',
		'listCommitHistory',
		'getCommitHistoryWindow',
		'listBranchComparison'
	],
	batchDeleteBranches: [
		'getRepository',
		'getBranchList',
		'listCommitHistory',
		'getCommitHistoryWindow',
		'listBranchComparison'
	],
	updateBranchSelectionBatch: ['getBranchList'],
	setBranchSelectionAll: ['getBranchList'],
	batchCreateLockedBranches: ['listLockedBranches', 'getBranchList'],
	batchDeleteLockedBranches: ['listLockedBranches', 'getBranchList'],
	// Worktree mutations use add/remove/lock/unlock prefixes the resource
	// extractor doesn't recognize, so map them explicitly to the worktree list.
	// Adding a worktree may also create a branch, so it refreshes the branch list.
	addWorktree: ['listWorktrees', 'getBranchList'],
	removeWorktree: ['listWorktrees'],
	lockWorktree: ['listWorktrees'],
	unlockWorktree: ['listWorktrees'],
	deleteRepository: [
		'getBranchList',
		'getBranchMergeStatus',
		'getCommitReachability',
		'listBranchSelection',
		'listDeletedBranchSelection',
		'listLockedBranches'
	]
};

/**
 * Extract query key resource(s) from command name
 * Converts command names to kebab-case resource identifiers
 *
 * @param commandName - The Tauri command name
 * @returns The resource key(s) in kebab-case (string or array)
 *
 * @example
 * getResource('listSelectedBranches') // 'selected-branches'
 * getResource('batchDeleteBranches') // 'branches'
 * getResource('getRepositoryList') // 'repository'
 * getResource('updateCurrentBranch') // ['repository']
 */
export function getResource(commandName: CommandName): string | string[] {
	const extracted = extractResource(commandName);

	// Check special cases first
	if (RESOURCE_MAPPINGS[commandName]) {
		// Combine all resources: mapping resources + extracted resource
		const mapping = RESOURCE_MAPPINGS[commandName].map((resource) => extractResource(resource));
		return [extracted, ...mapping];
	}

	// Extract resource (already in kebab-case from extractResource)
	return extracted;
}

/**
 * Decide whether a query should be invalidated when `repositoryId` changed
 * on disk (external git change picked up by the filesystem watcher).
 *
 * Matches that repository's branch list and repository record, plus the
 * repository list query (whose `branchesCount` feeds the sidebar for every
 * repo, including ones that aren't currently open).
 *
 * @param queryKey - The query key to test (shape: [resource, commandName, input])
 * @param repositoryId - The repository that changed
 */
export function matchesRepositoryChange(
	queryKey: readonly unknown[],
	repositoryId: string
): boolean {
	const [resource, commandName, input] = queryKey;

	if (resource === 'branch' && commandName === 'getBranchList') {
		return hasRepoId(input) && input.repoId === repositoryId;
	}
	if (resource === 'repository' && commandName === 'getRepository') {
		return (
			input !== null &&
			typeof input === 'object' &&
			'id' in input &&
			(input as { id: unknown }).id === repositoryId
		);
	}
	// The repository list carries branchesCount for the sidebar — always refresh.
	if (resource === 'repository' && commandName === 'getRepositoryList') {
		return true;
	}
	// Commit-history queries key their input with the owning repoId (the wire
	// input only carries a path); an on-disk change to that repo stales the
	// walk, its deep-link windows, and the ahead/behind comparisons.
	if (
		resource === 'commit-history' ||
		resource === 'commit-history-window' ||
		resource === 'branch-comparison'
	) {
		return hasRepoId(input) && input.repoId === repositoryId;
	}
	return false;
}

/**
 * Check if a query key matches a mutation key for invalidation
 * Uses partial matching - if queryKey starts with mutationKey, it's a match
 *
 * @param queryKey - The query key to check
 * @param mutationKey - The mutation key to match against
 * @returns true if the query should be invalidated
 *
 * @example
 * shouldInvalidate(['branches', { repoId: '1' }], ['branches']) // true
 * shouldInvalidate(['repository', '/path'], ['branches']) // false
 */
export function shouldInvalidate(
	queryKey: readonly unknown[],
	mutationKey: readonly unknown[]
): boolean {
	if (mutationKey.length === 0) return false;
	if (queryKey.length < mutationKey.length) return false;

	// Check if queryKey starts with mutationKey
	return mutationKey.every((value, index) => {
		return JSON.stringify(queryKey[index]) === JSON.stringify(value);
	});
}
