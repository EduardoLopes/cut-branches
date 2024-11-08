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

/**
 * Retrieves the 'repositories' item from localStorage and parses it into a Repository array.
 * If the code is not running in a browser environment or if there is an error during parsing,
 * an empty array is returned.
 *
 * @returns {Repository[]} The parsed 'repositories' item from localStorage, or an empty array if not available or an error occurs.
 */
function getLocalStorage(): Repository[] {
	if (typeof window !== 'undefined') {
		try {
			const data = localStorage?.getItem('repositories');
			return data ? JSON.parse(data) : [];
		} catch (error) {
			console.error('Error parsing localStorage data:', error);
			return [];
		}
	}
	return [];
}

/**
 * A class to manage the repositories.
 * It provides methods to add, remove, clear, and retrieve repositories,
 * and persists the state in localStorage.
 */
class RepositoriesStore {
	#repositories = $state(getLocalStorage());
	list = $derived(this.#repositories);

	constructor() {
		window.addEventListener('storage', () => {
			const storedValueStr = localStorage.getItem('repositories');
			if (storedValueStr == null) {
				this.#repositories = [];
				return;
			}

			const localValue = JSON.parse(storedValueStr);
			if (localValue !== this.#repositories) this.#repositories = localValue;
		});
	}

	get first(): Repository | undefined {
		return this.#repositories[0] ? this.#repositories[0] : undefined;
	}

	/**
	 * Adds a repository to the store.
	 * If a repository with the same id already exists, it will be updated.
	 *
	 * @param repo - The repository to add or update.
	 */
	add(repo: Repository) {
		const index = this.#repositories.findIndex((existingRepo) => existingRepo.id === repo.id);
		if (index !== -1) {
			this.#repositories[index] = repo;
		} else {
			this.#repositories = [...this.#repositories, repo].sort((a, b) =>
				a.name.localeCompare(b.name)
			);
		}
		this.#updateBranches();
	}

	/**
	 * Removes a repository from the store by its id.
	 *
	 * @param id - The id of the repository to remove.
	 */
	remove(id: string) {
		this.#repositories = this.#repositories.filter((repo) => repo.id !== id);
		this.#updateBranches();
	}

	/**
	 * Clears all repositories from the store.
	 */
	clear() {
		this.#repositories = [];

		this.#updateBranches();
	}

	findByPath(path?: string): Repository | undefined {
		if (!path) return undefined;
		return this.#repositories.find((repo) => repo.path === path);
	}

	findById(id?: string): Repository | undefined {
		if (!id) return undefined;
		return this.#repositories.find((repo) => repo.id === id);
	}

	#updateBranches() {
		if (typeof window !== 'undefined') {
			try {
				localStorage?.setItem('repositories', JSON.stringify(this.#repositories));
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

// Export an instance of the RepositoriesStore
export const repositories = new RepositoriesStore();
