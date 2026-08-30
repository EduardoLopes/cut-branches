import { goto } from '$app/navigation';
import { resolveRepositoryPath } from '$lib/repository-route';
import { Store } from '$lib/store.svelte';
import { RepositorySchema, type Repository } from '$types/repository';

/**
 * RepositoryStore - Manages individual repository UI state
 * Note: Repository list is now managed in the database via list_repositories query
 * This store only handles current repository UI state and navigation
 */
export class RepositoryStore extends Store<Repository | undefined> {
	constructor(repository: string) {
		super(repository, RepositorySchema, undefined);
	}

	set(value?: Repository) {
		const oldId = this.state?.id;
		super.set(value);

		// Navigate to repository page if it's a new repository
		if (value?.id && value.id !== oldId) {
			goto(resolveRepositoryPath(value.id));
		}
	}

	clear() {
		super.clear();
	}
}

// Repository store cache to maintain singleton instances
const repositoryStoreCache: Record<string, RepositoryStore> = {};

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
