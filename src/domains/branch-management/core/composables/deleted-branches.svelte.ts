import { SvelteDate } from 'svelte/reactivity';
import { z } from 'zod/v4';
import type { Branch } from '$infrastructure/bindings';
import { Store } from '$lib/store.svelte';

export interface DeletedBranchesState {
	branches: Branch[];
}

// Branch schema for validation - matches the Branch type from bindings
const BranchSchema = z.object({
	name: z.string(),
	fullyMerged: z.boolean(),
	lastCommit: z.object({
		sha: z.string(),
		shortSha: z.string(),
		date: z.string(),
		message: z.string(),
		author: z.string(),
		email: z.string()
	}),
	current: z.boolean(),
	deletedAt: z.string().nullable(),
	isReachable: z.boolean().nullable(),
	isSelected: z.boolean(),
	isLocked: z.boolean()
});

const deletedBranchesStateSchema = z.object({
	branches: z.array(BranchSchema)
});

export class DeletedBranchesStore extends Store<DeletedBranchesState> {
	constructor(repositoryId: string) {
		const storeKey = `deleted_branches_${repositoryId}`;
		super(storeKey, deletedBranchesStateSchema, { branches: [] });
	}

	// Add a branch to the deleted branches log
	addDeletedBranch(branch: Branch): void {
		const currentState = this.get();
		if (!currentState) return;

		const currentBranches = [...currentState.branches];

		// Add the branch to the deleted branches list
		currentBranches.push({
			...branch,
			deletedAt: new SvelteDate().toISOString(),
			isReachable: true // Assume initially reachable since it was just deleted
		});

		// Sort by deletion date (newest first)
		currentBranches.sort(
			(a, b) =>
				new SvelteDate(b.deletedAt ?? '').getTime() - new SvelteDate(a.deletedAt ?? '').getTime()
		);

		this.set({ branches: currentBranches });
	}

	// Remove a branch from the deleted branches log
	removeDeletedBranch(branchName: string): void {
		const currentState = this.get();
		if (!currentState) return;

		const currentBranches = currentState.branches.filter((branch) => branch.name !== branchName);
		this.set({ branches: currentBranches });
	}

	// Update the reachability status of a branch
	updateBranchReachability(branchName: string, isReachable: boolean): void {
		const currentState = this.get();
		if (!currentState) return;

		const currentBranches = [...currentState.branches];
		const branchIndex = currentBranches.findIndex((branch) => branch.name === branchName);

		if (branchIndex !== -1) {
			currentBranches[branchIndex] = {
				...currentBranches[branchIndex],
				isReachable
			};
			this.set({ branches: currentBranches });
		}
	}
}

// Store cache to maintain singleton instances
const deletedBranchesStoreCache: Record<string, DeletedBranchesStore> = {};

// Creates or retrieves a DeletedBranchesStore instance
export function getDeletedBranchesStore(repositoryId?: string): DeletedBranchesStore | undefined {
	if (!repositoryId) {
		return undefined;
	}

	// Create a cache key based on the repository path
	const key = `deleted_branches_${repositoryId}`;

	if (!deletedBranchesStoreCache[key]) {
		deletedBranchesStoreCache[key] = new DeletedBranchesStore(repositoryId);
	}

	return deletedBranchesStoreCache[key];
}
