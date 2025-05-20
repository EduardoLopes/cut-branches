import { z } from 'zod/v4';
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
	lastCommit: Commit;
	fullyMerged: boolean;
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
	lastCommit: commitSchema,
	fullyMerged: z.boolean()
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

// Schema for repository names (array of strings or undefined)
const repositoryNameSchema = z.string();

// Repository store cache to maintain singleton instances
const repositoryStoreCache: Record<string, RepositoryStore> = {};

export class RepositoryStore extends Store<Repository | undefined> {
	constructor(repository: string) {
		super(repository, repositorySchema, undefined);
	}

	static repositories = SetStore.getInstance<string>(
		['repositories'],
		repositoryNameSchema,
		[] as string[]
	);

	set(value?: Repository) {
		const oldName = this.state?.name; // Capture state *before* super.set

		super.set(value);

		if (value?.name) {
			// Only navigate if the name is new or different from the old one.
			// This prevents re-navigation when just refreshing data for the same repository.
			if (value.name !== oldName) {
				goto(`/repos/${value.name}`);
			}
			RepositoryStore.repositories.add([value.name]);
		} else if (oldName) {
			// If value is undefined (repository cleared) and there was an old name,
			// remove it from the set of repositories.
			// Consider if navigation to a default page (e.g., '/') is needed here.
			RepositoryStore.repositories.delete([oldName]);
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
