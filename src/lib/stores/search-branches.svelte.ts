import { getLocalStorage } from '$lib/utils/get-local-storage';

class SearchBranches {
	#repository: string | undefined; // Private property to store repository name
	query = $state<string | undefined>(); // State to store the search query

	get localStorageKey() {
		return `search_${this.#repository}`;
	}

	/**
	 * Constructor to initialize the Search instance.
	 * @param {string} [repository] - The repository name.
	 */
	constructor(repository?: string) {
		this.#repository = repository;
		this.query = this.#getLocalStorage() ?? undefined; // Initialize query from localStorage

		// Add event listener to update query when localStorage changes
		window.addEventListener('storage', () => {
			this.query = this.#getLocalStorage();
		});
	}

	/**
	 * Sets the search query and updates localStorage.
	 * @param {string} value - The search query.
	 */
	set(value: string) {
		if (this.#repository) {
			this.query = value;
			this.#updateLocalStorage(); // Update localStorage with new query
		}
	}

	/**
	 * Updates the search query from localStorage.
	 */
	update() {
		this.query = this.#getLocalStorage();
	}

	/**
	 * Clears the search query and updates localStorage.
	 */
	clear() {
		if (this.#repository) {
			this.query = undefined;
			this.#updateLocalStorage(); // Update localStorage with cleared query
		}
	}

	/**
	 * Removes the search query from localStorage.
	 */
	destroy() {
		localStorage?.removeItem(this.localStorageKey); // Remove item from localStorage
	}

	/**
	 * Retrieves data from localStorage for the current repository.
	 * @returns {string | undefined} - The stored data or undefined if not found.
	 */
	#getLocalStorage(): string | undefined {
		return getLocalStorage(this.localStorageKey, undefined);
	}

	/**
	 * Updates the localStorage with the current query.
	 * @private
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#repository) {
			try {
				// Store the query in localStorage
				if (this.query !== undefined) {
					localStorage?.setItem(this.localStorageKey, JSON.stringify(this.query));
				} else {
					localStorage?.removeItem(this.localStorageKey);
				}
			} catch (error) {
				// Log error if setting localStorage fails
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

// Define an object to store instances of the SelectedBranches class
const instances: { [key: string]: SearchBranches } = {};

export function getSearchBranchesStore(repository?: string): SearchBranches {
	// If an instance for the repository does not exist, create one
	if (repository && !instances[repository]) {
		instances[repository] = new SearchBranches(repository);
	}
	// Return the instance for the repository
	if (repository) {
		return instances[repository];
	}
	return new SearchBranches();
}
