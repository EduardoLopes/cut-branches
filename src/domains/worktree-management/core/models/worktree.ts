import type { Worktree as WorktreeData } from '$infrastructure/bindings';

/**
 * Worktree domain model.
 *
 * Wraps the wire DTO produced by the `worktree_management` backend and exposes
 * intent-revealing accessors. Immutable — construct a new instance to represent
 * a changed worktree.
 */
export class Worktree {
	private readonly data: WorktreeData;

	constructor(data: WorktreeData) {
		this.data = data;
	}

	/** Builds a Worktree from its wire DTO. */
	static fromData(data: WorktreeData): Worktree {
		return new Worktree(data);
	}

	/** Returns the wire DTO for this worktree. */
	toData(): WorktreeData {
		return this.data;
	}

	/** Administrative name (the entry under `.git/worktrees/`). */
	getName(): string {
		return this.data.name;
	}

	/** Absolute path to the worktree's working directory. */
	getPath(): string {
		return this.data.path;
	}

	/** Short name of the checked-out branch, or `null` when detached/missing. */
	getBranch(): string | null {
		return this.data.branch;
	}

	/** Full SHA of the worktree's HEAD, or `null` when unresolved. */
	getHeadSha(): string | null {
		return this.data.headSha;
	}

	/** First 7 characters of the HEAD SHA, or `null` when unresolved. */
	getShortSha(): string | null {
		return this.data.headSha ? this.data.headSha.slice(0, 7) : null;
	}

	/** Whether the worktree is locked (protected from pruning). */
	isLocked(): boolean {
		return this.data.isLocked;
	}

	/** Reason recorded when the worktree was locked, if any. */
	getLockReason(): string | null {
		return this.data.lockReason;
	}

	/** The main worktree (the repository itself) — can't be removed or locked. */
	isMain(): boolean {
		return this.data.isMain;
	}

	/** Whether git considers this worktree prunable (its working dir is gone). */
	isPrunable(): boolean {
		return this.data.isPrunable;
	}

	/** Value equality by name and path. */
	equals(other: Worktree): boolean {
		return this.data.name === other.getName() && this.data.path === other.getPath();
	}
}
