import type { RestoreBranchResult } from '$infrastructure/bindings';
import type { NotificationData } from '$services/notifications/notifications.svelte';
import { ensureString, formatString } from '$utils/string-utils';

export function buildRestoreSuccessNotification(
	restoredBranches: RestoreBranchResult[],
	repositoryName: string | undefined
): NotificationData | null {
	if (restoredBranches.length === 0) return null;

	const message = restoredBranches
		.map((result) =>
			formatString('- **{name}** (at {sha})', {
				name: ensureString(result.branchName).trim(),
				sha: result.branch ? ensureString(result.branch.lastCommit.shortSha).trim() : ''
			})
		)
		.join('\n\n');

	return {
		feedback: 'success',
		title: formatString('{type} restored to {repo} repository', {
			type: restoredBranches.length > 1 ? 'Branches' : 'Branch',
			repo: ensureString(repositoryName)
		}),
		message
	};
}

/**
 * Danger toast listing branches whose restoration failed without throwing
 * (the batch command records per-item failures instead of aborting). Returns
 * `null` when nothing failed.
 */
export function buildRestoreFailureNotification(
	failedBranches: RestoreBranchResult[],
	repositoryName: string | undefined
): NotificationData | null {
	if (failedBranches.length === 0) return null;

	const message = failedBranches
		.map((result) =>
			formatString('- **{name}**: {reason}', {
				name: ensureString(result.branchName).trim(),
				reason: ensureString(result.message).trim() || 'unknown error'
			})
		)
		.join('\n\n');

	return {
		feedback: 'danger',
		title: formatString('{count} could not be restored to {repo} repository', {
			count: failedBranches.length > 1 ? `${failedBranches.length} branches` : 'One branch',
			repo: ensureString(repositoryName)
		}),
		message
	};
}
