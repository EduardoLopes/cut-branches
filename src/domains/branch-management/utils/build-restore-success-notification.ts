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
