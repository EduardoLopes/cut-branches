// Define an interface for the selected branches structure
interface Selected {
	[key: string]: string[];
}

// Function to retrieve selected branches data from localStorage
function getLocalStorage(): Selected {
	// Check if the code is running in a browser environment
	if (typeof window !== 'undefined') {
		try {
			// Attempt to get the 'selected' item from localStorage
			const data = localStorage?.getItem('selected');
			// Parse and return the data if it exists, otherwise return an empty object
			return data ? JSON.parse(data) : {};
		} catch (error) {
			// Log any errors that occur during parsing
			console.error('Error parsing localStorage data:', error);
			return {};
		}
	}
	// Return an empty object if not in a browser environment
	return {};
}

/**
 * Class to manage selected branches for a given repository.
 */
class SelectedBranches {
	// Define a private state for the repository
	#repository = $state<string | undefined>();
	// Define a private state for the locked branches
	#selected = $state(getLocalStorage());

	/**
	 * Gets the list of locked branches for the current repository.
	 *
	 * @returns An array of locked branch names.
	 */
	list = $derived(this.#repository ? (this.#selected[this.#repository] ?? []) : []);

	// Constructor to initialize the repository
	constructor(repository?: string) {
		this.#repository = repository;
	}

	/**
	 * Adds a list of branches to the selected branches state for the current repository.
	 * If the repository is defined, it retrieves the current list of selected branches,
	 * combines it with the new branches, and updates the state with a unique list of branches.
	 *
	 * @param branches - An array of branch names to be added to the selected branches state.
	 */
	add(branches: string[]) {
		if (this.#repository) {
			// Get the current list of selected branches for the repository
			const ids = this.#selected[this.#repository] ?? [];
			// Combine the current list with the new branches and remove duplicates
			const uniqueIds = Array.from(new Set([...ids, ...branches]));
			// Update the selected branches state
			this.#selected = { ...this.#selected, [this.#repository]: uniqueIds };
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Clears the selected branches for the current repository.
	 * If a repository is specified, it sets the selected branches list for that repository to an empty array.
	 */
	clear() {
		if (this.#repository) {
			// Set the selected branches list for the repository to an empty array
			this.#selected = { ...this.#selected, [this.#repository]: [] };
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Removes the specified branches from the selected branches list for the current repository.
	 *
	 * @param branches - An array of branch names to be removed from the selected branches list.
	 */
	remove(branches: string[]) {
		if (this.#repository) {
			// Get the current list of selected branches for the repository
			const ids = this.#selected[this.#repository] ?? [];
			// Filter out the branches to be removed
			this.#selected = {
				...this.#selected,
				[this.#repository]: ids.filter((id: string) => !branches.includes(id))
			};
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Checks if a given branch is in the selected list for the current repository.
	 *
	 * @param branch - The name of the branch to check.
	 * @returns `true` if the branch is in the selected list, otherwise `false`.
	 */
	has(branch: string): boolean {
		return this.#repository ? (this.#selected[this.#repository]?.includes(branch) ?? false) : false;
	}

	/**
	 * Updates the localStorage with the current selected branches state.
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined') {
			try {
				// Set the 'selected' item in localStorage with the current state
				localStorage?.setItem('selected', JSON.stringify(this.#selected));
			} catch (error) {
				// Log any errors that occur during setting localStorage
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

// Define an object to store instances of SelectedBranches
const instances: { [key: string]: SelectedBranches } = {};

/**
 * Retrieves or creates an instance of the SelectedBranches store for a given repository.
 *
 * @param repository - The name of the repository for which to get the SelectedBranches store.
 *                     If not provided, a new instance of SelectedBranches is returned.
 * @returns An instance of the SelectedBranches store for the specified repository, or a new instance if no repository is specified.
 */
export function getSelectedBranchesStore(repository?: string): SelectedBranches {
	if (repository) {
		// If an instance for the repository does not exist, create one
		if (!instances[repository]) {
			instances[repository] = new SelectedBranches(repository);
		}
		// Return the instance for the repository
		return instances[repository];
	}
	// Return a new instance if no repository is specified
	return new SelectedBranches();
}
