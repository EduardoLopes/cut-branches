import { SvelteSet } from 'svelte/reactivity';
import { z } from 'zod/v4';
import { goto } from '$app/navigation';
import { RepositorySchema, type Repository } from '$services/common';
import { getValidatedLocalStorage } from '$utils/get-validated-local-storage';
import { setValidatedLocalStorage } from '$utils/set-validated-local-storage';
import { Store } from '$utils/store.svelte';

// Schema for repository names list
const repositoriesListSchema = z.array(z.string());

export class RepositoryStore extends Store<Repository | undefined> {
	constructor(repository: string) {
		super(repository, RepositorySchema, undefined);
	}

	// Create a static reactive Set to store repository names
	static _repositoriesSet = new SvelteSet<string>();

	// No static initializer block - we'll use explicit initialization instead

	// Explicit method to load repositories that can be called when needed
	static loadRepositories() {
		try {
			// Load repository names list using validated localStorage
			const result = getValidatedLocalStorage('repositories_list', repositoriesListSchema, []);

			if (result.success && result.data) {
				// Clear existing data to avoid duplicates
				RepositoryStore._repositoriesSet.clear();

				// Add each repository name and ensure its store is initialized
				result.data.forEach((name) => {
					RepositoryStore._repositoriesSet.add(name);
					// Create/get the store to ensure it's available
					getRepositoryStore(name);
				});
			} else if (result.error) {
				console.error('Error loading repositories list:', result.error);
			}
		} catch (error) {
			console.error('Failed to load repositories from localStorage:', error);
		}
	}

	// Helper to save repositories to localStorage
	private static saveRepositories() {
		try {
			const repoArray = Array.from(RepositoryStore._repositoriesSet);

			// Use validated localStorage to store repositories list
			const result = setValidatedLocalStorage(
				'repositories_list',
				repoArray,
				repositoriesListSchema
			);

			if (!result.success) {
				console.error('Error saving repositories list:', result.error);
			}
		} catch (error) {
			console.error('Failed to save repositories to localStorage:', error);
		}
	}

	// Provide a static getter that gives reactive access to the repositories
	static get repositories() {
		return {
			// Convert to array for consistent access and reactivity tracking
			get list() {
				return Array.from(RepositoryStore._repositoriesSet);
			},

			// Methods to modify the reactive collection
			add(names: string[]) {
				names.forEach((name) => RepositoryStore._repositoriesSet.add(name));
				RepositoryStore.saveRepositories();
			},

			delete(names: string[]) {
				names.forEach((name) => RepositoryStore._repositoriesSet.delete(name));
				RepositoryStore.saveRepositories();
			},

			has(name: string) {
				return RepositoryStore._repositoriesSet.has(name);
			},

			clear() {
				RepositoryStore._repositoriesSet.clear();
				RepositoryStore.saveRepositories();
			}
		};
	}

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
