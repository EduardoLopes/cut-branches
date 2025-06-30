import { z } from 'zod/v4';

// Commit schema
export const CommitSchema = z.object({
	sha: z.string(),
	shortSha: z.string(),
	date: z.string(),
	message: z.string(),
	author: z.string(),
	email: z.string()
});

export type Commit = z.infer<typeof CommitSchema>;

// Branch schema
export const BranchSchema = z
	.object({
		name: z.string(),
		current: z.boolean(),
		lastCommit: CommitSchema,
		fullyMerged: z.boolean(),
		deletedAt: z.string().optional(),
		isReachable: z.boolean().optional()
	})
	.passthrough();

export type Branch = z.infer<typeof BranchSchema>;

// Repository schema
export const RepositorySchema = z.object({
	branches: z.array(BranchSchema),
	path: z.string(),
	name: z.string(),
	currentBranch: z.string(),
	branchesCount: z.number(),
	id: z.string()
});

export type Repository = z.infer<typeof RepositorySchema>;

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
