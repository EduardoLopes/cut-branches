/**
 * CommitSha Value Object
 *
 * Represents a Git commit SHA with validation and formatting capabilities.
 * Ensures that only valid SHA formats are created and provides type safety.
 */

export class CommitSha {
	private readonly value: string;

	/**
	 * Creates a new CommitSha instance
	 * @param sha - The commit SHA (full 40-char hex or short 7+ char hex)
	 * @throws {Error} If the SHA format is invalid
	 */
	constructor(sha: string) {
		const normalized = sha.trim();

		if (!this.isValidSha(normalized)) {
			throw new Error(
				`Invalid commit SHA format: "${sha}". Expected 40-character full SHA or 7+ character short SHA (hexadecimal).`
			);
		}

		this.value = normalized;
	}

	/**
	 * Gets the SHA value
	 * @returns The commit SHA string
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Gets a short version of the SHA (first 7 characters)
	 * @param length - Optional custom length for short SHA (default: 7)
	 * @returns Short SHA string
	 */
	getShortSha(length: number = 7): string {
		if (length < 4) {
			throw new Error('Short SHA length must be at least 4 characters');
		}
		if (length > this.value.length) {
			throw new Error(`Short SHA length ${length} exceeds SHA length ${this.value.length}`);
		}
		return this.value.substring(0, length);
	}

	/**
	 * Checks if this is a full SHA (40 characters)
	 * @returns True if this is a full SHA
	 */
	isFullSha(): boolean {
		return this.value.length === 40;
	}

	/**
	 * Checks if this is a short SHA (less than 40 characters)
	 * @returns True if this is a short SHA
	 */
	isShortSha(): boolean {
		return this.value.length < 40;
	}

	/**
	 * Compares this CommitSha with another for equality
	 * Two SHAs are equal if they have the same value or if one is a prefix of the other
	 * @param other - The other CommitSha to compare
	 * @returns True if the SHAs are equal or compatible
	 */
	equals(other: CommitSha): boolean {
		const thisValue = this.value;
		const otherValue = other.getValue();

		// Exact match
		if (thisValue === otherValue) {
			return true;
		}

		// Check if one is a short version of the other
		const shorter = thisValue.length < otherValue.length ? thisValue : otherValue;
		const longer = thisValue.length < otherValue.length ? otherValue : thisValue;

		return longer.startsWith(shorter);
	}

	/**
	 * Validates the SHA format
	 * @param sha - The SHA to validate
	 * @returns True if valid
	 */
	private isValidSha(sha: string): boolean {
		if (!sha || sha.length === 0) {
			return false;
		}

		// Must be hexadecimal
		const hexPattern = /^[0-9a-f]+$/i;
		if (!hexPattern.test(sha)) {
			return false;
		}

		// Full SHA: exactly 40 characters
		// Short SHA: at least 7 characters (Git convention), max 39
		return sha.length === 40 || (sha.length >= 7 && sha.length < 40);
	}

	/**
	 * String representation of the CommitSha
	 * @returns The SHA value
	 */
	toString(): string {
		return this.value;
	}
}
