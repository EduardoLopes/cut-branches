import type { GetBranchListInput, GetRepositoryInput } from '$lib/bindings';

/**
 * Type guard to check if a value has a repoId property
 * @param value - The value to check
 * @returns True if the value is an object with a repoId string property
 */
export function hasRepoId(value: unknown): value is GetBranchListInput {
	return (
		value !== null &&
		typeof value === 'object' &&
		'repoId' in value &&
		typeof value.repoId === 'string'
	);
}

/**
 * Type guard to check if a value has a path property
 * @param value - The value to check
 * @returns True if the value is an object with a path string property
 */
export function hasPath(value: unknown): value is GetRepositoryInput {
	return (
		value !== null && typeof value === 'object' && 'path' in value && typeof value.path === 'string'
	);
}
