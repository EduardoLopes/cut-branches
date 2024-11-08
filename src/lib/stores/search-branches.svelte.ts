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
		this.query = this.#getLocalStorage(); // Initialize query from localStorage

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
		// Check if window is defined and repository is provided
		if (typeof window !== 'undefined' && this.#repository) {
			try {
				// Retrieve data from localStorage
				const data = localStorage?.getItem(this.localStorageKey);
				// Parse and return the data if it exists
				return data ? JSON.parse(data) : undefined;
			} catch (error) {
				// Log error if parsing fails
				console.error('Error parsing localStorage data:', error);
				return undefined;
			}
		}
		return undefined;
	}

	/**
	 * Updates the localStorage with the current query.
	 * @private
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#repository) {
			try {
				// Store the query in localStorage
				localStorage?.setItem(this.localStorageKey, JSON.stringify(this.query));
			} catch (error) {
				// Log error if setting localStorage fails
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

const instances: { [key: string]: SearchBranches } = {}; // Object to store Search instances

/**
 * Retrieves or creates a Search instance for a given repository.
 * @param {string} [repository] - The repository name.
 * @returns {SearchBranches} - The Search instance.
 */
export function getSearchBranchesStore(repository?: string): SearchBranches {
	if (repository) {
		// Create a new instance if it doesn't exist
		if (!instances[repository]) {
			instances[repository] = new SearchBranches(repository);
		}
		return instances[repository];
	}
	return new SearchBranches(); // Return a new instance if no repository is provided
}
