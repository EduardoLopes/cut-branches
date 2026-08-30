/**
 * Repository sync indicator (active repo)
 *
 * The backend filesystem watcher keeps every registered repository's DB
 * projection in sync and emits `repository-changed`, which a global listener
 * turns into query invalidation (see `providers.svelte`). This composable is
 * the *safety net* for the currently-open repository: on mount and on window
 * focus it checks whether git's on-disk state has drifted from the last sync
 * (a change the watcher may have missed while the app was backgrounded), heals
 * it silently, and exposes `outOfSync` so a manual refresh affordance can
 * appear only in that rare case.
 */

import { useQueryClient } from '@tanstack/svelte-query';
import { commands } from '$infrastructure/bindings';
import { matchesRepositoryChange } from '$infrastructure/query-key-utils';

export function useRepositoryWatch(getRepositoryId: () => string) {
	const queryClient = useQueryClient();

	// True only when the active repo is drifted and hasn't healed — the one case
	// where a manual refresh button should surface. Hidden otherwise.
	let outOfSync = $state(false);

	// Bumped by every check. A check is a two-round-trip conversation, so the
	// active repository can change mid-flight — only the newest generation may
	// write `outOfSync`, otherwise repository A's verdict lands on repository B.
	let generation = 0;

	function setOutOfSync(run: number, value: boolean) {
		if (run !== generation) return;
		outOfSync = value;
	}

	function invalidate(repositoryId: string) {
		return queryClient.invalidateQueries({
			predicate: (query) => matchesRepositoryChange(query.queryKey, repositoryId)
		});
	}

	async function checkSync(repositoryId: string) {
		const run = ++generation;
		try {
			const status = await commands.getRepositorySyncStatus({ repositoryId });
			if (status.status !== 'ok') return;
			if (!status.data.drifted) {
				setOutOfSync(run, false);
				return;
			}
			// Drift detected: heal silently, then re-check so the indicator clears
			// once the projection is back in sync.
			setOutOfSync(run, true);
			await invalidate(repositoryId);
			const recheck = await commands.getRepositorySyncStatus({ repositoryId });
			setOutOfSync(run, recheck.status === 'ok' ? recheck.data.drifted : false);
		} catch {
			// Ignore; the next focus retries.
		}
	}

	/** Force a refresh and re-check — backs the manual refresh button. */
	async function refresh() {
		const repositoryId = getRepositoryId();
		if (!repositoryId) return;
		await invalidate(repositoryId);
		await checkSync(repositoryId);
	}

	$effect(() => {
		const repositoryId = getRepositoryId();
		if (!repositoryId) return;

		checkSync(repositoryId);

		function onFocus() {
			if (document.visibilityState === 'hidden') return;
			checkSync(repositoryId);
		}
		window.addEventListener('focus', onFocus);
		document.addEventListener('visibilitychange', onFocus);

		return () => {
			window.removeEventListener('focus', onFocus);
			document.removeEventListener('visibilitychange', onFocus);
		};
	});

	return {
		get outOfSync() {
			return outOfSync;
		},
		refresh
	};
}
