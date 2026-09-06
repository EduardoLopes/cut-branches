import { type Branch } from '$domains/branch-management/core/models/branch';
import { css } from '@pindoba/styled-system/css';

/**
 * Gets the appropriate color palette for a branch based on its state
 * @param branch - The branch domain model
 * @param selected - Whether the branch is selected
 * @returns CSS class string for the color palette
 */
export function getBranchColorPalette(branch: Branch, selected: boolean): string {
	if (selected) {
		return css({ colorPalette: 'danger' });
	}

	if (branch.isCurrent()) {
		return css({ colorPalette: 'primary' });
	}

	return css({ colorPalette: 'neutral' });
}

/**
 * Generates alert conditions for a branch
 * @param branch - The branch domain model
 * @param selected - Whether the branch is selected
 * @param mergeStatus - Optional override for merge status (e.g. from the
 *   branch-metrics query); falls back to the branch's own `fullyMerged`,
 *   which the listing sync computes on the Rust side
 * @returns Array of alert types that should be shown
 */
export function getBranchAlerts(
	branch: Branch,
	selected: boolean,
	mergeStatus?: boolean
): string[] {
	// The listing carries a truthful `fullyMerged` (one revwalk over HEAD's
	// history per sync), so the alert is known synchronously — rows never
	// grow after mount waiting for it. A caller with fresher data may override.
	const isNotMerged = !(mergeStatus ?? branch.isMerged());

	const alerts = branch.getAlerts();
	const filteredAlerts: string[] = [];

	if (isNotMerged) {
		filteredAlerts.push('fullyMerged');
	}

	if (alerts.includes('protectedWords') && selected) {
		filteredAlerts.push('protectedWords');
	}

	if (alerts.includes('offensiveWords')) {
		filteredAlerts.push('offensiveWords');
	}

	return filteredAlerts;
}

/**
 * Generates a consistent ID for branch-related elements
 * @param branchName - The branch name
 * @param suffix - Optional suffix for the ID
 * @returns Formatted ID string
 */
export function getBranchElementId(branchName: string, suffix?: string): string {
	const baseId = `branch-${branchName}`;
	return suffix ? `${baseId}-${suffix}` : baseId;
}

/**
 * Checks if a branch has any alerts that should be displayed
 * @param alerts - Array of alert types
 * @param branch - The branch domain model
 * @returns Boolean indicating if alerts should be shown
 */
export function shouldShowBranchAlerts(alerts: string[], branch: Branch): boolean {
	if (alerts.length === 0) return false;

	// Don't show fully merged alert for current branch
	if (alerts.length === 1 && alerts[0] === 'fullyMerged' && branch.isCurrent()) {
		return false;
	}

	return true;
}
