import { z } from 'zod/v4';

// TODO: extend this folder with schemas + inferred types for other shared
// app shapes (branches, delete-branches input, switch-branch input, etc.).
// The previous `$services/common` file held a few that were unused; add
// them back here when they get real consumers, co-located one shape per
// file (e.g. `src/types/branch.ts`).

// Repository schema for combined repository + branches data.
// Distinct from the Repository type in `$infrastructure/bindings`, which
// reflects the raw DB row.
export const RepositorySchema = z.object({
	branches: z.array(z.any()),
	path: z.string(),
	name: z.string(),
	currentBranch: z.string(),
	branchesCount: z.number(),
	id: z.string()
});

export type Repository = z.infer<typeof RepositorySchema>;
