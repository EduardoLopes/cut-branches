import { useQueryClient } from '@tanstack/svelte-query';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { getCleanupConfig } from './use-cleanup-config.svelte';
import { isKept, keepAll, keepNone, toggleKept } from './use-cleanup-keeplist.svelte';
import {
	createListStaleRepositoriesQuery,
	removeCleanedTargetFromCache
} from '$domains/repository-cleanup/infrastructure/queries/create-list-stale-repositories-query';
import type {
	CleanupTargetCleanedEvent,
	DeletionMode,
	StaleRepository,
	StaleScanProgressEvent
} from '$infrastructure/bindings';
import { executeCommand } from '$infrastructure/tauri-commands';
import { cleanupSummary } from '$lib/cleanup-summary.svelte';
import { notifications } from '$services/notifications/notifications.svelte';
import { formatBytes } from '$utils/format-bytes';

/** Live progress of an in-flight stale scan, streamed from the backend. */
export interface StaleScanProgress {
	scanned: number;
	total: number;
	found: number;
}

/**
 * Application logic for the bulk cleanup page. The scan is a cached query, so
 * the last result is shown instantly on revisit and only re-scanned in the
 * background when stale — the full "scanning" state appears only on the very
 * first load. Selection is opt-out per path (a folder is cleaned unless kept,
 * persisted per-repo in the keep-list). Cleans run sequentially; each deleted
 * folder emits a `cleanup-target-cleaned` event that drops it from the cached
 * scan, so the list updates immediately without a full re-walk.
 */
export function useStaleRepositories() {
	const query = createListStaleRepositoriesQuery(() => ({
		thresholdDays: getCleanupConfig().thresholdDays
	}));
	const queryClient = useQueryClient();

	let isCleaning = $state(false);
	let progress = $state<StaleScanProgress | null>(null);

	const repositories = $derived<StaleRepository[]>(query.data?.repositories ?? []);
	const totalReclaimableBytes = $derived(query.data?.totalReclaimableBytes ?? 0);

	// Stream scan progress from the backend while a scan is in flight.
	$effect(() => {
		let unlisten: UnlistenFn | null = null;
		let cancelled = false;
		listen<StaleScanProgressEvent>('stale-scan-progress', (event) => {
			progress = {
				scanned: event.payload.scanned,
				total: event.payload.total,
				found: event.payload.found
			};
		})
			.then((fn) => {
				if (cancelled) fn();
				else unlisten = fn;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	});

	// Optimistically drop a folder from the cached scan the moment the backend
	// reports it deleted, so the list reflects a clean without a full re-scan.
	$effect(() => {
		let unlisten: UnlistenFn | null = null;
		let cancelled = false;
		listen<CleanupTargetCleanedEvent>('cleanup-target-cleaned', (event) => {
			removeCleanedTargetFromCache(queryClient, {
				repositoryId: event.payload.repositoryId,
				path: event.payload.path
			});
		})
			.then((fn) => {
				if (cancelled) fn();
				else unlisten = fn;
			})
			.catch(() => {});
		return () => {
			cancelled = true;
			unlisten?.();
		};
	});

	// Keep the shared summary (sidebar badge) in sync with the latest scan.
	$effect(() => {
		if (query.data) cleanupSummary.set(query.data.totalReclaimableBytes);
	});

	/** The targets of a repo that will be cleaned (i.e. not kept). */
	function cleanableTargets(repo: StaleRepository) {
		return repo.targets.filter((t) => !isKept(repo.id, t.path));
	}

	const selectedBytes = $derived(
		repositories.reduce(
			(sum, r) => sum + cleanableTargets(r).reduce((s, t) => s + t.sizeBytes, 0),
			0
		)
	);
	/** Repositories with at least one path still selected for cleaning. */
	const selectedRepos = $derived(repositories.filter((r) => cleanableTargets(r).length > 0));
	const selectedCount = $derived(selectedRepos.length);

	// Aggregate selection across every repository, for the "select all" control.
	const totalTargetCount = $derived(repositories.reduce((s, r) => s + r.targets.length, 0));
	const selectedTargetCount = $derived(
		repositories.reduce((s, r) => s + cleanableTargets(r).length, 0)
	);
	const allSelected = $derived(totalTargetCount > 0 && selectedTargetCount === totalTargetCount);
	const someSelected = $derived(selectedTargetCount > 0 && selectedTargetCount < totalTargetCount);

	/** Whether a single path is selected for cleaning. */
	function isTargetSelected(repoId: string, path: string) {
		return !isKept(repoId, path);
	}

	/** Toggle a single path in/out of the clean selection. */
	function toggleTarget(repoId: string, path: string) {
		toggleKept(repoId, path);
	}

	/** How many of a repo's paths are selected for cleaning. */
	function repoSelectedCount(repoId: string) {
		const repo = repositories.find((r) => r.id === repoId);
		return repo ? cleanableTargets(repo).length : 0;
	}

	/** Whether every path in a repo is selected for cleaning. */
	function isRepoAllSelected(repoId: string) {
		const repo = repositories.find((r) => r.id === repoId);
		return !!repo && repo.targets.length > 0 && repoSelectedCount(repoId) === repo.targets.length;
	}

	/** Whether only some of a repo's paths are selected (indeterminate checkbox). */
	function isRepoIndeterminate(repoId: string) {
		const count = repoSelectedCount(repoId);
		return count > 0 && !isRepoAllSelected(repoId);
	}

	/** Select or deselect every path across every repository for cleaning. */
	function setAll(checked: boolean) {
		for (const repo of repositories) {
			if (checked) {
				keepNone(repo.id);
			} else {
				keepAll(
					repo.id,
					repo.targets.map((t) => t.path)
				);
			}
		}
	}

	/** Select or deselect every path of a repository for cleaning. */
	function toggleRepo(repoId: string, checked: boolean) {
		const repo = repositories.find((r) => r.id === repoId);
		if (!repo) return;
		if (checked) {
			keepNone(repoId);
		} else {
			keepAll(
				repoId,
				repo.targets.map((t) => t.path)
			);
		}
	}

	/** Cleans every repository's selected paths sequentially in the given mode. */
	async function cleanSelected(mode: DeletionMode) {
		if (isCleaning || selectedRepos.length === 0) return;

		isCleaning = true;
		let freedBytes = 0;
		let cleanedRepos = 0;
		let failedTargets = 0;

		try {
			for (const repo of selectedRepos) {
				const paths = cleanableTargets(repo);
				if (paths.length === 0) continue;
				try {
					const output = await executeCommand('cleanRepository', {
						repositoryId: repo.id,
						repositoryPath: repo.path,
						targets: paths.map((t) => t.path),
						mode
					});
					freedBytes += output.freedBytes;
					const succeeded = output.results.filter((r) => r.ok).length;
					failedTargets += output.results.length - succeeded;
					// The command succeeding only means it ran — every individual
					// folder can still have failed. Counting the repo regardless
					// let the summary claim "Cleaned 3 repositories" when nothing
					// was actually removed from them.
					if (succeeded > 0) cleanedRepos += 1;
				} catch {
					// executeCommand throws on a whole-command failure; count the repo's
					// selected targets as failed and continue with the rest.
					failedTargets += paths.length;
				}
			}
		} finally {
			isCleaning = false;
		}

		// No re-scan here: each deleted folder emits `cleanup-target-cleaned`, and
		// the listener above drops it from the cached scan — so the list updates
		// immediately without waiting on a full re-walk.
		notifications.push({
			feedback: failedTargets > 0 ? 'warning' : 'success',
			title: `Cleaned ${cleanedRepos} ${cleanedRepos === 1 ? 'repository' : 'repositories'}`,
			message:
				`Reclaimed ${formatBytes(freedBytes)}` +
				(failedTargets > 0 ? ` · ${failedTargets} folder(s) could not be deleted` : '') +
				(mode === 'trash' ? '\n\nEmpty your Trash to actually free the space.' : '')
		});
	}

	return {
		get repositories() {
			return repositories;
		},
		get hasScanned() {
			return query.isSuccess;
		},
		/** True only on the first load (no cached data yet). */
		get isScanning() {
			return query.isLoading;
		},
		/** True when re-scanning in the background with data already shown. */
		get isRefreshing() {
			return query.isFetching && !query.isLoading;
		},
		get isCleaning() {
			return isCleaning;
		},
		get progress() {
			return progress;
		},
		get selectedCount() {
			return selectedCount;
		},
		get selectedBytes() {
			return selectedBytes;
		},
		get repositoryCount() {
			return repositories.length;
		},
		get totalReclaimableBytes() {
			return totalReclaimableBytes;
		},
		get allSelected() {
			return allSelected;
		},
		get someSelected() {
			return someSelected;
		},
		setAll,
		isTargetSelected,
		toggleTarget,
		repoSelectedCount,
		isRepoAllSelected,
		isRepoIndeterminate,
		toggleRepo,
		rescan: () => query.refetch(),
		cleanSelected
	};
}
