import { getSelectedBranchesStore } from './selected-branches.svelte';

// Define an interface for the locked branches structure
interface Locked {
	[key: string]: string[];
}

// Function to retrieve locked branches data from localStorage
function getLocalStorage(): Locked {
	// Check if the code is running in a browser environment
	if (typeof window !== 'undefined') {
		try {
			// Attempt to get the 'locked' item from localStorage
			const data = localStorage?.getItem('locked');
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
 * Class to manage locked branches for a given repository.
 */
class LockedBranches {
	/**
	 * A private property that holds the current repository state.
	 * The state can be a string representing the repository or undefined.
	 *
	 * @private
	 * @type {string | undefined}
	 */
	#repository = $state<string | undefined>();

	/**
	 * A private property that holds the state of locked branches.
	 * The state is initialized with the value retrieved from local storage.
	 */
	#locked = $state(getLocalStorage());

	/**
	 * Gets the list of locked branches for the current repository.
	 *
	 * @returns An array of locked branch names.
	 */
	list = $derived(this.#repository ? (this.#locked[this.#repository] ?? []) : []);

	// Constructor to initialize the repository
	constructor(repository?: string) {
		this.#repository = repository;
	}

	/**
	 * Adds a list of branches to the locked branches state for the current repository.
	 * If the repository is defined, it retrieves the current list of locked branches,
	 * combines it with the new branches, and updates the state with a unique list of branches.
	 *
	 * @param branches - An array of branch names to be added to the locked branches state.
	 */
	// Method to add branches to the locked branches state
	add(branches: string[]) {
		if (this.#repository) {
			// Get the current list of locked branches for the repository
			const ids = this.#locked[this.#repository] ?? [];
			// Combine the current list with the new branches and remove duplicates
			const uniqueIds = Array.from(new Set([...ids, ...branches]));
			// Update the locked branches state
			this.#locked = { ...this.#locked, [this.#repository]: uniqueIds };
			// Update the localStorage with the new state
			this.#updateLocalStorage();

			const selected = getSelectedBranchesStore(this.#repository);
			selected.remove(branches);
		}
	}

	/**
	 * Clears the locked branches for the current repository.
	 * If a repository is specified, it sets the locked branches list for that repository to an empty array.
	 */
	// Method to clear the locked branches for the current repository
	clear() {
		if (this.#repository) {
			// Set the locked branches list for the repository to an empty array
			this.#locked = { ...this.#locked, [this.#repository]: [] };
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Removes the specified branches from the locked branches list for the current repository.
	 *
	 * @param branches - An array of branch names to be removed from the locked branches list.
	 */
	remove(branches: string[]) {
		if (this.#repository) {
			// Get the current list of locked branches for the repository
			const ids = this.#locked[this.#repository] ?? [];
			// Filter out the branches to be removed
			this.#locked = {
				...this.#locked,
				[this.#repository]: ids.filter((id: string) => !branches.includes(id))
			};
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
	}

	/**
	 * Checks if a given branch is in the locked list for the current repository.
	 *
	 * @param branch - The name of the branch to check.
	 * @returns `true` if the branch is in the locked list, otherwise `false`.
	 */
	has(branch: string): boolean {
		return this.#repository ? (this.#locked[this.#repository]?.includes(branch) ?? false) : false;
	}

	/**
	 * Updates the localStorage with the current locked branches state.
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined') {
			try {
				// Set the 'locked' item in localStorage with the current state
				localStorage?.setItem('locked', JSON.stringify(this.#locked));
			} catch (error) {
				// Log any errors that occur during setting localStorage
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

// Define an object to store instances of LockedBranches
const instances: { [key: string]: LockedBranches } = {};

/**
 * Retrieves or creates an instance of the LockedBranches store for a given repository.
 *
 * @param repository - The name of the repository for which to get the LockedBranches store.
 *                     If not provided, a new instance of LockedBranches is returned.
 * @returns An instance of the LockedBranches store for the specified repository, or a new instance if no repository is specified.
 */
export function getLockedBranchesStore(repository?: string): LockedBranches {
	if (repository) {
		// If an instance for the repository does not exist, create one
		if (!instances[repository]) {
			instances[repository] = new LockedBranches(repository);
		}
		// Return the instance for the repository
		return instances[repository];
	}
	// Return a new instance if no repository is specified
	return new LockedBranches();
}
