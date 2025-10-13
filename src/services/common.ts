import { z } from 'zod/v4';

// Repository schema for combined repository + branches data
// Note: This is different from the Repository type in bindings which is just the DB model
export const RepositorySchema = z.object({
	branches: z.array(z.any()), // Branch[] - using any to avoid circular dependency with bindings
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
