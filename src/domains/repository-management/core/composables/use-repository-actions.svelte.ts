import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
import { notifications } from '$services/notifications/notifications.svelte';
import { getErrorMessage } from '$utils/error-utils';

interface UseRepositoryActionsOptions {
	/**
	 * Re-attaches the filesystem watch and forces a refresh. Provided by the
	 * watch composable so the manual "Update" action reuses the same code path
	 * the automatic watcher uses.
	 */
	onRefresh?: () => Promise<void>;
}

/**
 * Application logic backing the repository options menu: revealing the repo in
 * the OS file manager and manually refreshing its projection. Kept transport-
 * and UI-agnostic so the header can render it as menu items (or anything else).
 */
export function useRepositoryActions(
	repositoryId: () => string,
	options: UseRepositoryActionsOptions = {}
) {
	const getRepositoryListQuery = createGetRepositoryListQuery();

	const repository = $derived(
		getRepositoryListQuery.data?.find((repo) => repo.id === repositoryId())
	);

	let isRefreshing = $state(false);

	async function reveal() {
		if (!repository) return;

		try {
			// Opens the OS file manager (Finder / Explorer / etc.) with the
			// repository folder highlighted in its parent directory.
			await revealItemInDir(repository.path);
		} catch (error) {
			notifications.push({
				title: 'Could not open folder',
				message: `Failed to reveal **${repository.name}** in the file manager`,
				feedback: 'danger'
			});
			console.error('revealItemInDir failed', error);
		}
	}

	async function update() {
		if (isRefreshing) return;

		isRefreshing = true;

		const repoName = repository?.name ?? 'Repository';

		try {
			await options.onRefresh?.();

			notifications.push({
				title: 'Repository updated',
				message: `The repository **${repoName}** was updated`,
				feedback: 'success'
			});
		} catch (error) {
			// A rejected refresh used to escape as an unhandled rejection while the
			// success toast still fired. Report it instead.
			notifications.push({
				title: 'Could not update repository',
				message: `Failed to update **${repoName}**: ${getErrorMessage(error)}`,
				feedback: 'danger'
			});
			console.error('repository refresh failed', error);
		} finally {
			isRefreshing = false;
		}
	}

	return {
		get repository() {
			return repository;
		},
		get isRefreshing() {
			return isRefreshing;
		},
		reveal,
		update
	};
}
