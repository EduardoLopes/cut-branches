import { Worktree } from './worktree';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';

/**
 * Conversion utilities between the worktree wire DTO and the domain model.
 * Used by the list query's `select` to hand components domain models.
 */
export const WorktreeConverters = {
	/** Converts a single WorktreeData to a Worktree domain model. */
	fromData: (data: WorktreeData): Worktree => Worktree.fromData(data),

	/** Converts a Worktree domain model back to its wire DTO. */
	toData: (worktree: Worktree): WorktreeData => worktree.toData(),

	/** Converts an array of WorktreeData to Worktree domain models. */
	fromDataArray: (data: WorktreeData[]): Worktree[] => data.map(Worktree.fromData),

	/** Converts an array of Worktree domain models back to wire DTOs. */
	toDataArray: (worktrees: Worktree[]): WorktreeData[] => worktrees.map((w) => w.toData())
} as const;
