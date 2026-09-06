/**
 * RepositoryPath Value Object
 *
 * Represents a file system path to a repository with validation and normalization.
 * Ensures that only valid, non-empty paths are created.
 */

export class RepositoryPath {
	private readonly value: string;

	/**
	 * Creates a new RepositoryPath instance
	 * @param path - The file system path to the repository
	 * @throws {Error} If the path is invalid
	 */
	constructor(path: string) {
		const normalized = this.normalizePath(path);

		if (!this.isValidPath(normalized)) {
			throw new Error(`Invalid repository path: "${path}". Expected a non-empty file system path.`);
		}

		this.value = normalized;
	}

	/**
	 * Gets the repository path value
	 * @returns The repository path string
	 */
	getValue(): string {
		return this.value;
	}

	/**
	 * Gets the directory name (last segment of the path)
	 * @returns The directory name
	 * @example new RepositoryPath('/path/to/repo').getBasename() // returns 'repo'
	 */
	getBasename(): string {
		// Handle Windows paths
		const separator = this.value.includes('\\') ? '\\' : '/';
		const segments = this.value.split(separator).filter((s) => s.length > 0);
		return segments[segments.length - 1] || '';
	}

	/**
	 * Gets the parent directory path
	 * @returns The parent directory path, or empty string if at root
	 * @example new RepositoryPath('/path/to/repo').getDirectory() // returns '/path/to'
	 */
	getDirectory(): string {
		// Handle Windows paths
		const separator = this.value.includes('\\') ? '\\' : '/';
		const segments = this.value.split(separator).filter((s) => s.length > 0);

		if (segments.length <= 1) {
			// Root or single segment
			return '';
		}

		segments.pop(); // Remove last segment
		const dir = segments.join(separator);

		// Preserve leading separator for absolute paths
		if (this.value.startsWith(separator)) {
			return separator + dir;
		}

		return dir;
	}

	/**
	 * Checks if this is an absolute path
	 * @returns True if the path is absolute
	 */
	isAbsolute(): boolean {
		// Unix/Linux/Mac absolute paths start with /
		if (this.value.startsWith('/')) {
			return true;
		}

		// Windows absolute paths: C:\ or C:/
		if (/^[a-zA-Z]:[/\\]/.test(this.value)) {
			return true;
		}

		return false;
	}

	/**
	 * Compares this RepositoryPath with another for equality
	 * @param other - The other RepositoryPath to compare
	 * @returns True if the paths are equal
	 */
	equals(other: RepositoryPath): boolean {
		return this.value === other.getValue();
	}

	/**
	 * Normalizes the path by trimming and removing trailing slashes
	 * @param path - The path to normalize
	 * @returns Normalized path
	 */
	private normalizePath(path: string): string {
		let normalized = path.trim();

		// Remove trailing slashes (but preserve root /)
		while (normalized.length > 1 && (normalized.endsWith('/') || normalized.endsWith('\\'))) {
			normalized = normalized.slice(0, -1);
		}

		return normalized;
	}

	/**
	 * Validates the repository path
	 * @param path - The path to validate
	 * @returns True if valid
	 */
	private isValidPath(path: string): boolean {
		// Must be a non-empty string
		if (path.length === 0) {
			return false;
		}

		// Should not contain null bytes
		if (path.includes('\0')) {
			return false;
		}

		return true;
	}

	/**
	 * String representation of the RepositoryPath
	 * @returns The path value
	 */
	toString(): string {
		return this.value;
	}
}
