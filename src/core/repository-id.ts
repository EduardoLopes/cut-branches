/**
 * RepositoryId Value Object
 *
 * Represents a repository identifier with validation.
 * Ensures that only valid, non-empty repository IDs are created.
 */

export class RepositoryId {
	private readonly value: string;

	/**
	 * Creates a new RepositoryId instance
	 * @param id - The repository ID
	 * @throws {Error} If the ID is invalid
	 */
	constructor(id: string) {
		const normalized = id.trim();

		if (!this.isValidId(normalized)) {
			throw new Error(`Invalid repository ID: "${id}". Expected a non-empty string identifier.`);
		}

		this.value = normalized;
	}

	/**
	 * Gets the repository ID value
	 * @returns The repository ID string
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Compares this RepositoryId with another for equality
	 * @param other - The other RepositoryId to compare
	 * @returns True if the IDs are equal
	 */
	equals(other: RepositoryId): boolean {
		return this.value === other.getValue();
	}

	/**
	 * Validates the repository ID
	 * @param id - The ID to validate
	 * @returns True if valid
	 */
	private isValidId(id: string): boolean {
		// Must be a non-empty string
		return id.length > 0;
	}

	/**
	 * String representation of the RepositoryId
	 * @returns The ID value
	 */
	toString(): string {
		return this.value;
	}
}
