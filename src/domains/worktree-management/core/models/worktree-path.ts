/**
 * WorktreePath Value Object.
 *
 * Represents the absolute filesystem path where a new worktree will be checked
 * out. Validates in the constructor so invalid input is caught at creation
 * rather than scattered through the UI.
 */
export class WorktreePath {
	private readonly value: string;

	/**
	 * @param path - The worktree path.
	 * @throws {Error} If the path is empty or not absolute.
	 */
	constructor(path: string) {
		const normalized = path.trim();

		if (!this.isValid(normalized)) {
			throw new Error(
				`Invalid worktree path: "${path}". The path must be a non-empty absolute path.`
			);
		}

		this.value = normalized;
	}

	/** Gets the path value. */
	getValue(): string {
		return this.value;
	}

	/** Compares two paths for value equality. */
	equals(other: WorktreePath): boolean {
		return this.value === other.getValue();
	}

	/** String representation of the path. */
	toString(): string {
		return this.value;
	}

	/**
	 * A worktree path must be non-empty, absolute (POSIX `/…` or Windows
	 * `C:\…`), and free of NUL characters.
	 */
	private isValid(path: string): boolean {
		if (path.length === 0) {
			return false;
		}

		const isPosixAbsolute = path.startsWith('/');
		const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(path);
		if (!isPosixAbsolute && !isWindowsAbsolute) {
			return false;
		}

		// eslint-disable-next-line no-control-regex
		if (/\x00/.test(path)) {
			return false;
		}

		return true;
	}
}
