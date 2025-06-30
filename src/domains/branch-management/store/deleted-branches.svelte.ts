import { z } from 'zod/v4';
import { BranchSchema, type Branch } from '$services/common';
import { Store } from '$utils/store.svelte';

export interface DeletedBranchesState {
	branches: Branch[];
}

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
			deletedAt: new Date().toISOString(),
			isReachable: true // Assume initially reachable since it was just deleted
		});

		// Sort by deletion date (newest first)
		currentBranches.sort(
			(a, b) => new Date(b.deletedAt ?? '').getTime() - new Date(a.deletedAt ?? '').getTime()
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
