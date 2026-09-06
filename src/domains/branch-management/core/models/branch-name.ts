import { PROTECTED_BRANCH_NAMES, POTENTIALLY_OFFENSIVE_BRANCH_NAMES } from './branch-constants';

/**
 * BranchName Value Object
 *
 * Represents a Git branch name with validation and business rules.
 * Ensures that only valid branch names are created and provides type safety.
 */

export class BranchName {
	private readonly value: string;

	/**
	 * Creates a new BranchName instance
	 * @param name - The branch name
	 * @throws {Error} If the branch name is invalid
	 */
	constructor(name: string) {
		const normalized = name.trim();

		if (!this.isValidGitBranchName(normalized)) {
			throw new Error(
				`Invalid branch name: "${name}". Branch names must be non-empty and follow Git naming rules.`
			);
		}

		this.value = normalized;
	}

	/**
	 * Gets the branch name value
	 * @returns The branch name string
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Checks if this branch name is protected (e.g., main, master, develop)
	 * Protected branches should be treated with caution when performing destructive operations
	 * @returns True if the branch name is in the protected list
	 */
	isProtected(): boolean {
		return PROTECTED_BRANCH_NAMES.some(
			(protectedName) => this.value.toLowerCase() === protectedName.toLowerCase()
		);
	}

	/**
	 * Checks if this branch name is potentially offensive
	 * @returns True if the branch name is in the potentially offensive list
	 */
	isPotentiallyOffensive(): boolean {
		return POTENTIALLY_OFFENSIVE_BRANCH_NAMES.some(
			(offensiveName) => this.value.toLowerCase() === offensiveName.toLowerCase()
		);
	}

	/**
	 * Compares this BranchName with another for equality
	 * @param other - The other BranchName to compare
	 * @returns True if the branch names are equal
	 */
	equals(other: BranchName): boolean {
		return this.value === other.getValue();
	}

	/**
	 * Validates the branch name according to Git naming rules
	 * Based on git-check-ref-format rules
	 * @param name - The branch name to validate
	 * @returns True if valid
	 */
	private isValidGitBranchName(name: string): boolean {
		// Must be non-empty
		if (name.length === 0) {
			return false;
		}

		// Cannot start with a dot
		if (name.startsWith('.')) {
			return false;
		}

		// Cannot end with a dot
		if (name.endsWith('.')) {
			return false;
		}

		// Cannot end with .lock
		if (name.endsWith('.lock')) {
			return false;
		}

		// Cannot start with a slash
		if (name.startsWith('/')) {
			return false;
		}

		// Cannot end with a slash
		if (name.endsWith('/')) {
			return false;
		}

		// Cannot contain two consecutive dots (..)
		if (name.includes('..')) {
			return false;
		}

		// Cannot contain ASCII control characters (\x00-\x1f, \x7f)
		// eslint-disable-next-line no-control-regex
		if (/[\x00-\x1f\x7f]/.test(name)) {
			return false;
		}

		// Cannot contain space, tilde (~), caret (^), colon (:), question mark (?),
		// asterisk (*), or open bracket ([)
		if (/[ ~^:?*[\]]/.test(name)) {
			return false;
		}

		// Cannot contain backslash (\)
		if (name.includes('\\')) {
			return false;
		}

		// Cannot be a single '@' character
		if (name === '@') {
			return false;
		}

		// Cannot contain '@{' sequence
		if (name.includes('@{')) {
			return false;
		}

		// Cannot have multiple consecutive slashes
		if (name.includes('//')) {
			return false;
		}

		return true;
	}

	/**
	 * String representation of the BranchName
	 * @returns The branch name value
	 */
	toString(): string {
		return this.value;
	}
}
