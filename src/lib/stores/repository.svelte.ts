import { z } from 'zod';
import { Store } from '../utils/store.svelte';
import { goto } from '$app/navigation';
import { SetStore } from '$lib/utils/set-store.svelte';

export interface Commit {
	hash: string;
	date: string;
	message: string;
	author: string;
	email: string;
}

export interface Branch {
	name: string;
	current: boolean;
	last_commit: Commit;
	fully_merged: boolean;
}

export interface Repository {
	path: string;
	branches: Branch[];
	name: string;
	currentBranch: string;
	branchesCount: number;
	id: string;
}

// Define Zod schemas
const commitSchema = z.object({
	hash: z.string(),
	date: z.string(),
	message: z.string(),
	author: z.string(),
	email: z.string()
});

const branchSchema = z.object({
	name: z.string(),
	current: z.boolean(),
	last_commit: commitSchema,
	fully_merged: z.boolean()
});

const repositorySchema = z
	.object({
		path: z.string(),
		branches: z.array(branchSchema),
		name: z.string(),
		currentBranch: z.string(),
		branchesCount: z.number(),
		id: z.string()
	})
	.optional();

// Schema for repository names
const repositoryNameSchema = z.string().optional();

// Repository store cache to maintain singleton instances
const repositoryStoreCache: Record<string, RepositoryStore> = {};

export class RepositoryStore extends Store<Repository | undefined> {
	constructor(repository: string) {
		super(repository, repositorySchema);
	}

	static repositories = SetStore.getInstance<string | undefined>(
		['repositories'],
		repositoryNameSchema
	);

	set(value?: Repository) {
		super.set(value);

		if (value?.name) {
			goto(`/repos/${value.name}`);
			RepositoryStore.repositories.add([value.name]);
		} else {
			if (this.state?.name) {
				RepositoryStore.repositories.delete([this.state?.name]);
			}
		}
	}

	clear() {
		if (this.state?.name) {
			RepositoryStore.repositories.delete([this.state?.name]);
		}
		super.clear();
	}
}

// Creates or retrieves a RepositoryStore instance
export function getRepositoryStore(repository?: string) {
	if (!repository) {
		return;
	}

	const key = `repository_${repository}`;

	if (!repositoryStoreCache[key]) {
		repositoryStoreCache[key] = new RepositoryStore(key);
	}

	return repositoryStoreCache[key];
}
