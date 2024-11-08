import { getLocalStorage } from '$lib/utils/get-local-storage';

// Define an interface for the selected branches structure
interface Selected {
	[key: string]: Set<string>;
}

/**
 * Retrieves the 'selected' item from localStorage and parses it into a Selected object.
 * If the code is not running in a browser environment or if there is an error during parsing,
 * an empty object is returned.
 *
 * @returns {Selected} The parsed 'selected' item from localStorage, or an empty object if not available or an error occurs.
 */
function getSelectedBranchesFromLocalStorage(): Selected {
	const parsedData: Selected = getLocalStorage('selected', {});
	Object.keys(parsedData).forEach((key) => {
		parsedData[key] = new Set(parsedData[key]);
	});
	return parsedData;
}

/**
 * A class to manage the selected branches for a given repository.
 * It provides methods to add, remove, clear, and check branches in the selected list,
 * and persists the state in localStorage.
 */
class SelectedBranches {
	// Define a private state for the repository
	#repository: string | undefined = undefined;
	// Define a private state for the locked branches
	#selected = $state(getSelectedBranchesFromLocalStorage());

	/**
	 * Gets the list of locked branches for the current repository.
	 *
	 * @returns An array of locked branch names.
	 */
	list = $derived(this.#repository ? [...this.#selected[this.#repository]] : []);

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
			const ids = this.#selected[this.#repository] ?? new Set();
			// Add new branches to the set to ensure uniqueness
			branches.forEach((branch) => ids.add(branch));
			// Update the selected branches state
			this.#selected[this.#repository] = ids;
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Clears the selected branches for the current repository.
	 * If a repository is specified, it sets the selected branches list for that repository to an empty set.
	 */
	clear() {
		if (this.#repository) {
			// Set the selected branches list for the repository to an empty set
			this.#selected[this.#repository] = new Set();
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
			const ids = this.#selected[this.#repository] ?? new Set();
			// Remove the branches from the set
			branches.forEach((branch) => ids.delete(branch));
			// Update the selected branches state
			this.#selected[this.#repository] = ids;
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
		return (this.#repository && this.#selected[this.#repository]?.has(branch)) || false;
	}

	/**
	 * Updates the localStorage with the current selected branches state.
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined') {
			try {
				// Convert sets to arrays for storage
				const selected: { [key: string]: string[] } = {};
				for (const key in this.#selected) {
					selected[key] = [...this.#selected[key]];
				}
				// Set the 'selected' item in localStorage with the current state
				localStorage?.setItem('selected', JSON.stringify(selected));
			} catch (error) {
				// Log any errors that occur during setting localStorage
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

export function getSelectedBranchesStore(repository?: string): SelectedBranches {
	// Return a new instance if no repository is specified
	return new SelectedBranches(repository);
}
