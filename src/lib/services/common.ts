import { z } from 'zod';
import type { Repository as RepoType, Branch as BranchType } from '$lib/stores/repository.svelte';

// Common error schema
export const TauriErrorSchema = z
	.object({
		message: z.string(),
		kind: z.string().optional(),
		description: z.string().optional()
	})
	.passthrough();

export type TauriError = z.infer<typeof TauriErrorSchema>;

// Service error schema
export const ServiceErrorSchema = z.object({
	message: z.string(),
	kind: z.string(),
	description: z.string()
});

export type ServiceError = z.infer<typeof ServiceErrorSchema>;

// Commit schema
export const CommitSchema = z.object({
	hash: z.string(),
	date: z.string(),
	message: z.string(),
	author: z.string(),
	email: z.string()
});

// Branch schema
export const BranchSchema = z
	.object({
		name: z.string(),
		current: z.boolean(),
		lastCommit: CommitSchema,
		fullyMerged: z.boolean()
	})
	.passthrough();

export type Branch = BranchType;

// Repository schema
export const RepositorySchema = z
	.object({
		branches: z.array(BranchSchema),
		path: z.string(),
		name: z.string(),
		currentBranch: z.string(),
		id: z.string()
	})
	.passthrough();

export type Repository = RepoType;

// Simple branch schema for delete operations
export const SimpleBranchSchema = z.object({
	name: z.string(),
	current: z.boolean()
});

export type SimpleBranch = z.infer<typeof SimpleBranchSchema>;

// Input schema for delete branches
export const DeleteBranchesInputSchema = z.object({
	branches: z.array(SimpleBranchSchema),
	path: z.string().min(1, 'Repository path is required')
});

export type DeleteBranchesVariables = z.infer<typeof DeleteBranchesInputSchema>;

// Input schema for switch branch
export const SwitchBranchInputSchema = z.object({
	path: z.string().min(1, 'Repository path is required'),
	branch: z.string().min(1, 'Branch name is required')
});

export type SwitchBranchVariables = z.infer<typeof SwitchBranchInputSchema>;

// Standardized error handling for Tauri invocations
export function handleTauriError(error: unknown): ServiceError {
	// Check if it's a structured error from Tauri
	if (typeof error === 'object' && error !== null) {
		const result = TauriErrorSchema.safeParse(error);
		if (result.success) {
			const tauriError = result.data;
			return {
				message: tauriError.message || 'An operation failed',
				kind: tauriError.kind || 'unknown_error',
				description: tauriError.description || 'An unexpected error occurred'
			};
		}
	}

	// If it's not a structured error or parsing failed, return a generic error
	return {
		message: 'Operation failed',
		kind: 'unknown_error',
		description: String(error)
	};
}
