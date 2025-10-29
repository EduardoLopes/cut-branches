import { BranchName } from './branch-name';
import { Commit } from './commit';
import type { Branch as BranchData } from '$lib/bindings';

/**
 * Branch alert types
 */
export type BranchAlert = 'fullyMerged' | 'protectedWords' | 'offensiveWords';

/**
 * Color palette types for branch display
 */
export type ColorPalette = 'primary' | 'danger' | 'neutral';

/**
 * Branch Domain Model
 *
 * Represents a Git branch with both immutable git data and mutable application state.
 * Provides rich behavior for branch operations and business rules.
 */

export class Branch {
	private readonly name: BranchName;
	private readonly fullyMerged: boolean;
	private readonly lastCommit: Commit;
	private readonly current: boolean;
	private readonly deletedAt: Date | null;
	private readonly isReachable: boolean | null;
	private readonly isSelected: boolean;
	private readonly isLocked: boolean;

	/**
	 * Private constructor - use static factory methods to create instances
	 */
	private constructor(
		name: BranchName,
		fullyMerged: boolean,
		lastCommit: Commit,
		current: boolean,
		deletedAt: Date | null,
		isReachable: boolean | null,
		isSelected: boolean,
		isLocked: boolean
	) {
		this.name = name;
		this.fullyMerged = fullyMerged;
		this.lastCommit = lastCommit;
		this.current = current;
		this.deletedAt = deletedAt;
		this.isReachable = isReachable;
		this.isSelected = isSelected;
		this.isLocked = isLocked;
	}

	/**
	 * Creates a Branch from data transfer object
	 * @param data - The branch data from Tauri backend
	 * @returns A new Branch instance
	 */
	static fromData(data: BranchData): Branch {
		return new Branch(
			new BranchName(data.name),
			data.fullyMerged,
			Commit.fromData(data.lastCommit),
			data.current,
			data.deletedAt ? new Date(data.deletedAt) : null,
			data.isReachable,
			data.isSelected,
			data.isLocked
		);
	}

	/**
	 * Converts this Branch back to a data transfer object
	 * @returns BranchData object
	 */
	toData(): BranchData {
		return {
			name: this.name.getValue(),
			fullyMerged: this.fullyMerged,
			lastCommit: this.lastCommit.toData(),
			current: this.current,
			deletedAt: this.deletedAt ? this.deletedAt.toISOString() : null,
			isReachable: this.isReachable,
			isSelected: this.isSelected,
			isLocked: this.isLocked
		};
	}

	/**
	 * Gets the branch name
	 * @returns The branch name value
	 */
	getName(): string {
		return this.name.getValue();
	}

	/**
	 * Gets whether the branch is fully merged
	 * @returns True if fully merged
	 */
	isMerged(): boolean {
		return this.fullyMerged;
	}

	/**
	 * Gets the last commit on this branch
	 * @returns The Commit domain model
	 */
	getLastCommit(): Commit {
		return this.lastCommit;
	}

	/**
	 * Gets whether this is the current branch
	 * @returns True if this is the current branch
	 */
	isCurrent(): boolean {
		return this.current;
	}

	/**
	 * Gets the deletion date, if deleted
	 * @returns The deletion date or null
	 */
	getDeletedAt(): Date | null {
		return this.deletedAt;
	}

	/**
	 * Gets whether the branch is deleted
	 * @returns True if deleted
	 */
	isDeleted(): boolean {
		return this.deletedAt !== null;
	}

	/**
	 * Gets whether the branch's commit is reachable
	 * @returns True if reachable, false if not, null if unknown
	 */
	getIsReachable(): boolean | null {
		return this.isReachable;
	}

	/**
	 * Gets whether the branch is selected
	 * @returns True if selected
	 */
	getIsSelected(): boolean {
		return this.isSelected;
	}

	/**
	 * Gets whether the branch is locked
	 * @returns True if locked
	 */
	getIsLocked(): boolean {
		return this.isLocked;
	}

	/**
	 * Checks if this branch is protected (e.g., main, master, develop)
	 * @returns True if protected
	 */
	isProtected(): boolean {
		return this.name.isProtected();
	}

	/**
	 * Checks if this branch name is potentially offensive
	 * @returns True if potentially offensive
	 */
	isPotentiallyOffensive(): boolean {
		return this.name.isPotentiallyOffensive();
	}

	/**
	 * Checks if this branch can be selected for operations
	 * A branch is selectable if it's not the current branch and not locked
	 * @returns True if selectable
	 */
	isSelectable(): boolean {
		return !this.current && !this.isLocked;
	}

	/**
	 * Checks if this branch can be deleted
	 * A branch is deletable if it's not the current branch and not locked
	 * @returns True if deletable
	 */
	isDeletable(): boolean {
		return !this.current && !this.isLocked;
	}

	/**
	 * Gets the alerts that should be shown for this branch
	 * @param mergeStatus - Optional override for merge status
	 * @returns Array of alert types
	 */
	getAlerts(mergeStatus?: boolean): BranchAlert[] {
		const isNotMerged = mergeStatus !== undefined ? !mergeStatus : !this.fullyMerged;

		const alerts: BranchAlert[] = [];

		if (isNotMerged) {
			alerts.push('fullyMerged');
		}

		if (this.name.isProtected() && this.isSelected) {
			alerts.push('protectedWords');
		}

		if (this.name.isPotentiallyOffensive()) {
			alerts.push('offensiveWords');
		}

		return alerts;
	}

	/**
	 * Determines if alerts should be displayed for this branch
	 * @param alerts - The alerts array from getAlerts()
	 * @returns True if alerts should be shown
	 */
	shouldShowAlerts(alerts: BranchAlert[]): boolean {
		if (alerts.length === 0) {
			return false;
		}

		// Don't show fully merged alert for current branch
		if (alerts.length === 1 && alerts[0] === 'fullyMerged' && this.current) {
			return false;
		}

		return true;
	}

	/**
	 * Gets the color palette for this branch based on its state
	 * @param selected - Whether the branch is selected (optional, uses internal state if not provided)
	 * @returns The color palette name
	 */
	getColorPalette(selected?: boolean): ColorPalette {
		const isSelected = selected !== undefined ? selected : this.isSelected;

		if (isSelected) {
			return 'danger';
		}

		if (this.current) {
			return 'primary';
		}

		return 'neutral';
	}

	/**
	 * Creates a new Branch with updated selection status (immutable update)
	 * @param selected - The new selection status
	 * @returns A new Branch instance with updated selection
	 */
	withSelection(selected: boolean): Branch {
		return new Branch(
			this.name,
			this.fullyMerged,
			this.lastCommit,
			this.current,
			this.deletedAt,
			this.isReachable,
			selected,
			this.isLocked
		);
	}

	/**
	 * Creates a new Branch with updated lock status (immutable update)
	 * @param locked - The new lock status
	 * @returns A new Branch instance with updated lock status
	 */
	withLock(locked: boolean): Branch {
		return new Branch(
			this.name,
			this.fullyMerged,
			this.lastCommit,
			this.current,
			this.deletedAt,
			this.isReachable,
			this.isSelected,
			locked
		);
	}

	/**
	 * Compares this Branch with another for equality
	 * Two branches are equal if they have the same name
	 * @param other - The other Branch to compare
	 * @returns True if the branches are equal
	 */
	equals(other: Branch): boolean {
		return this.name.equals(other.name);
	}

	/**
	 * String representation of the Branch
	 * @returns A string in the format: "name (current, merged, selected, locked)"
	 */
	toString(): string {
		const flags = [];
		if (this.current) flags.push('current');
		if (this.fullyMerged) flags.push('merged');
		if (this.isSelected) flags.push('selected');
		if (this.isLocked) flags.push('locked');
		if (this.isDeleted()) flags.push('deleted');

		return `${this.name.getValue()}${flags.length > 0 ? ` (${flags.join(', ')})` : ''}`;
	}
}
