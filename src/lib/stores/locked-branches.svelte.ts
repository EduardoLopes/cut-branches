import { getSelectedBranchesStore } from './selected-branches.svelte';
import { getLocalStorage } from '$lib/utils/get-local-storage';

// Define an interface for the locked branches structure
interface Locked {
	[key: string]: Set<string>;
}

// Function to retrieve locked branches data from localStorage
function getLockedBranchesFromLocalStorage(): Locked {
	const parsedData: Locked = getLocalStorage('locked', {});
	const locked: Locked = {};
	for (const key in parsedData) {
		locked[key] = new Set(parsedData[key]);
	}
	return locked;
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
	#repository: string | undefined = undefined;

	/**
	 * A private property that holds the state of locked branches.
	 * The state is initialized with the value retrieved from local storage.
	 */
	#locked = $state(getLockedBranchesFromLocalStorage());

	/**
	 * Gets the list of locked branches for the current repository.
	 *
	 * @returns An array of locked branch names.
	 */
	list = $derived(this.#repository ? Array.from(this.#locked[this.#repository] ?? []) : []);

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
			// Get the current set of locked branches for the repository
			const ids = this.#locked[this.#repository] ?? new Set<string>();
			// Add new branches to the set
			branches.forEach((branch) => ids.add(branch));
			// Update the locked branches state
			this.#locked = { ...this.#locked, [this.#repository]: ids };
			// Update the localStorage with the new state
			this.#updateLocalStorage();

			const selected = getSelectedBranchesStore(this.#repository);
			selected.remove(branches);
		}
	}

	/**
	 * Clears the locked branches for the current repository.
	 * If a repository is specified, it sets the locked branches list for that repository to an empty set.
	 */
	// Method to clear the locked branches for the current repository
	clear() {
		if (this.#repository) {
			// Set the locked branches list for the repository to an empty set
			this.#locked = { ...this.#locked, [this.#repository]: new Set<string>() };
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
		// No action if no repository is specified
	}

	/**
	 * Removes the specified branches from the locked branches list for the current repository.
	 *
	 * @param branches - An array of branch names to be removed from the locked branches list.
	 */
	remove(branches: string[]) {
		if (this.#repository && this.#locked[this.#repository]) {
			// Get the current set of locked branches for the repository
			const ids = this.#locked[this.#repository];
			// Remove the branches from the set
			branches.forEach((branch) => ids.delete(branch));
			// Update the locked branches state
			this.#locked = { ...this.#locked, [this.#repository]: ids };
			// Update the localStorage with the new state
			this.#updateLocalStorage();
		}
		// No action if no repository is specified
	}

	/**
	 * Updates locked from localStorage.
	 */
	update() {
		this.#locked = getLockedBranchesFromLocalStorage();
	}

	/**
	 * Checks if a given branch is in the locked list for the current repository.
	 *
	 * @param branch - The name of the branch to check.
	 * @returns `true` if the branch is in the locked list, otherwise `false`.
	 */
	has(branch: string): boolean {
		return !!this.#repository && this.#locked[this.#repository]?.has(branch);
	}

	/**
	 * Updates the localStorage with the current locked branches state.
	 */
	#updateLocalStorage() {
		if (typeof window !== 'undefined') {
			try {
				// Convert sets to arrays for storage
				const locked: { [key: string]: string[] } = {};
				for (const key in this.#locked) {
					locked[key] = Array.from(this.#locked[key]);
				}
				// Set the 'locked' item in localStorage with the current state
				localStorage?.setItem('locked', JSON.stringify(locked));
			} catch (error) {
				// Log any errors that occur during setting localStorage
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

// Define an object to store instances of the SelectedBranches class
const instances: { [key: string]: LockedBranches } = {};

export function getLockedBranchesStore(repository?: string): LockedBranches {
	// If an instance for the repository does not exist, create one
	if (repository && !instances[repository]) {
		instances[repository] = new LockedBranches(repository);
	}
	// Return the instance for the repository
	if (repository) {
		return instances[repository];
	}
	return new LockedBranches();
}
