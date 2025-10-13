import { PROTECTED_BRANCH_NAMES, POTENTIALLY_OFFENSIVE_BRANCH_NAMES } from './branch-constants';
import type { Branch } from '$lib/bindings';
import { containsAnyWord } from '$utils/string-utils';
import { css } from '@pindoba/panda/css';

/**
 * Gets the appropriate color palette for a branch based on its state
 * @param branch - The branch data
 * @param selected - Whether the branch is selected
 * @returns CSS class string for the color palette
 */
export function getBranchColorPalette(branch: Branch, selected: boolean): string {
	if (selected) {
		return css({ colorPalette: 'danger' });
	}

	if (branch.current) {
		return css({ colorPalette: 'primary' });
	}

	return css({ colorPalette: 'neutral' });
}

/**
 * Generates alert conditions for a branch
 * @param branch - The branch data
 * @param selected - Whether the branch is selected
 * @returns Array of alert types that should be shown
 */
export function getBranchAlerts(branch: Branch, selected: boolean): string[] {
	const alerts = Object.entries({
		fullyMerged: branch.fullyMerged,
		protectedWords: containsAnyWord(branch.name, [...PROTECTED_BRANCH_NAMES]) && selected,
		offensiveWords: containsAnyWord(branch.name, [...POTENTIALLY_OFFENSIVE_BRANCH_NAMES])
	})
		.filter((item) => item[1] === true)
		.map((item) => item[0]);

	return alerts;
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
 * @param branch - The branch data
 * @returns Boolean indicating if alerts should be shown
 */
export function shouldShowBranchAlerts(alerts: string[], branch: Branch): boolean {
	if (alerts.length === 0) return false;

	// Don't show fully merged alert for current branch
	if (alerts.length === 1 && alerts[0] === 'fullyMerged' && branch.current) {
		return false;
	}

	return true;
}
