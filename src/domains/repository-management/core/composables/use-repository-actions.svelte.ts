import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
import { notifications } from '$services/notifications/notifications.svelte';

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

		try {
			await options.onRefresh?.();

			const repoName = repository?.name ?? 'Repository';
			notifications.push({
				title: 'Repository updated',
				message: `The repository **${repoName}** was updated`,
				feedback: 'success'
			});
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
