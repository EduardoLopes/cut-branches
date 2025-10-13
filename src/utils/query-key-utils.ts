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
	updateCurrentBranch: ['getRepository'],
	createBranchRestoration: ['getRepository'],
	batchCreateBranchRestorations: ['getRepository'],
	batchDeleteBranches: ['getRepository'],
	deleteAllSelectedBranches: ['listBranches']
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
