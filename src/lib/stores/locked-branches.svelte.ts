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
	#repository = $state<string | undefined>();
	#locked = $state(getLocalStorage());

	/**
	 * Gets the list of locked branches for the current repository.
	 *
	 * @returns An array of locked branch names.
	 */
	list = $derived(this.#repository ? (this.#locked[this.#repository] ?? []) : []);

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
	add(branches: string[]) {
		if (this.#repository) {
			const ids = this.#locked[this.#repository] ?? [];
			const uniqueIds = Array.from(new Set([...ids, ...branches]));
			this.#locked = { ...this.#locked, [this.#repository]: uniqueIds };
			this.#updateLocalStorage();
		}
	}

	/**
	 * Clears the locked branches for the current repository.
	 * If a repository is specified, it sets the locked branches list for that repository to an empty array.
	 */
	clear() {
		if (this.#repository) {
			this.#locked = { ...this.#locked, [this.#repository]: [] };
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
			const ids = this.#locked[this.#repository] ?? [];
			this.#locked = {
				...this.#locked,
				[this.#repository]: ids.filter((id: string) => !branches.includes(id))
			};
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
				localStorage?.setItem('locked', JSON.stringify(this.#locked));
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}
}

const instances: { [key: string]: LockedBranches } = {};

export function getLockedBranchesStore(repository?: string): LockedBranches {
	if (repository) {
		if (!instances[repository]) {
			instances[repository] = new LockedBranches(repository);
		}
		return instances[repository];
	}
	return new LockedBranches();
}
