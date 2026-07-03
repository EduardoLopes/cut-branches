/**
 * Branch-related constants for the branch management domain
 */

/**
 * Common protected branch names that should be treated with caution
 */
export const PROTECTED_BRANCH_NAMES = [
	'develop',
	'dev',
	'stg',
	'main',
	'staging',
	'master',
	'hml',
	'default',
	'trunk'
] as const;

/**
 * Branch names that may be considered offensive or non-inclusive
 */
export const POTENTIALLY_OFFENSIVE_BRANCH_NAMES = ['master'] as const;
