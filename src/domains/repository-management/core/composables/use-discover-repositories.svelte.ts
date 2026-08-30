import { useQueryClient } from '@tanstack/svelte-query';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { SvelteSet } from 'svelte/reactivity';
import { createDiscoverRepositoriesMutation } from '$domains/repository-management/infrastructure/mutations/create-discover-repositories-mutation';
import type { RepositoryScanProgressEvent } from '$infrastructure/bindings';
import { createGetRepositoryListQuery } from '$infrastructure/queries/create-get-repository-list-query';
import { executeCommand } from '$infrastructure/tauri-commands';
import { notifications } from '$services/notifications/notifications.svelte';
import { getErrorMessage } from '$utils/error-utils';

/**
 * Strips trailing path separators so paths compare equal regardless of a
 * trailing slash. The backend stores a repository's path from git2's
 * `repo.workdir()` (which always ends in `/`), while the scanner reports paths
 * without one — without this, an already-added repository would never match.
 */
function normalizePath(path: string): string {
	return path.replace(/[/\\]+$/, '') || path;
}

/** A repository found by a scan, annotated with whether it is already tracked. */
export interface DiscoveredItem {
	path: string;
	name: string;
	/** True when a repository with this path is already in the list. */
	alreadyAdded: boolean;
}

/** Live progress of an in-flight scan, streamed from the backend. */
export interface ScanProgress {
	scannedDirs: number;
	foundCount: number;
}

interface UseDiscoverRepositoriesOptions {
	/** Invoked with the number of repositories added after a bulk add. */
	onAdded?: (count: number) => void;
}

/**
 * Application logic backing the "scan for repositories" flow: run a filesystem
 * scan, let the user pick which results to add, then bulk-add the selection.
 *
 * Adds go straight through `executeCommand('createRepository')` in a loop so we
 * can surface a single summary notification instead of one toast per repo, and
 * invalidate the repository list only once at the end.
 */
export function useDiscoverRepositories(options: UseDiscoverRepositoriesOptions = {}) {
	const queryClient = useQueryClient();
	const repositoryListQuery = createGetRepositoryListQuery();
	const discoverMutation = createDiscoverRepositoriesMutation({
		meta: { showErrorNotification: true }
	});

	let results = $state<DiscoveredItem[]>([]);
	// SvelteSet is reactive on mutation, so it is mutated in place rather than
	// reassigned (no `$state` wrapper needed).
	const selected = new SvelteSet<string>();
	let scannedRoots = $state<string[]>([]);
	let hasScanned = $state(false);
	let isAdding = $state(false);
	let progress = $state<ScanProgress | null>(null);
	let isScanning = $state(false);
	// Every `scan()` run gets a token. Only the newest token may write results,
	// progress or the scanning flag — the backend has no cancellation, so a
	// superseded (or cancelled) run has to be discarded on this side instead.
	let scanToken = 0;

	const existingPaths = $derived(
		new SvelteSet((repositoryListQuery.data ?? []).map((repo) => normalizePath(repo.path)))
	);

	/** Result paths that can still be added (not already tracked). */
	const addablePaths = $derived(
		results.filter((item) => !item.alreadyAdded).map((item) => item.path)
	);

	const selectedCount = $derived(addablePaths.filter((path) => selected.has(path)).length);

	/**
	 * Scans the given roots (empty = the user's home directory), replacing any
	 * previous results and pre-selecting every not-yet-added repository.
	 */
	async function scan(roots: string[] = [], includeWorktrees = false) {
		// Supersede whatever run was in flight: its results are no longer wanted.
		const token = ++scanToken;
		isScanning = true;
		progress = { scannedDirs: 0, foundCount: 0 };

		// Stream live progress from the backend while the walk runs. `listen`
		// rejects outside a Tauri runtime (e.g. tests) — degrade gracefully.
		let unlisten: UnlistenFn | null = null;
		try {
			unlisten = await listen<RepositoryScanProgressEvent>('repository-scan-progress', (event) => {
				// The backend keeps walking for a superseded run; its ticks must not
				// overwrite the current run's counters.
				if (token !== scanToken) return;
				progress = {
					scannedDirs: event.payload.scannedDirs,
					foundCount: event.payload.foundCount
				};
			});
		} catch {
			// `listen` rejects outside a Tauri runtime (see above) — keep `unlisten` null.
		}

		try {
			const output = await discoverMutation.mutateAsync({
				roots,
				maxDepth: null,
				includeWorktrees
			});

			// A newer scan (or a cancel) took over while this one was walking —
			// dropping the payload keeps the newer run's results intact.
			if (token !== scanToken) return;

			scannedRoots = output.scannedRoots;
			results = output.repositories
				.map((repo) => ({
					path: repo.path,
					name: repo.name,
					alreadyAdded: existingPaths.has(normalizePath(repo.path))
				}))
				// Surface the repositories that can still be added first; already-added
				// ones sink to the bottom. Within each group, sort by name.
				.sort((a, b) => {
					if (a.alreadyAdded !== b.alreadyAdded) {
						return a.alreadyAdded ? 1 : -1;
					}
					return a.name.localeCompare(b.name);
				});
			selected.clear();
			for (const item of results) {
				if (!item.alreadyAdded) selected.add(item.path);
			}
			hasScanned = true;
			// Set the final counts from the command result so they're truthful even
			// when the scan finished too fast for the throttled events to catch up.
			progress = { scannedDirs: output.scannedDirs, foundCount: results.length };
		} finally {
			// Stop listening; keep the last counts so they stay visible during the
			// modal's brief minimum-loading window.
			unlisten?.();
			if (token === scanToken) isScanning = false;
		}
	}

	/**
	 * Abandons the in-flight scan (if any). The backend walk keeps running — it
	 * has no cancellation — but nothing it reports can reach the UI any more.
	 */
	function cancelScan() {
		scanToken += 1;
		isScanning = false;
	}

	/** Toggles a single result's selection. No-op for already-added repos. */
	function toggle(path: string) {
		if (selected.has(path)) {
			selected.delete(path);
		} else {
			selected.add(path);
		}
	}

	/** Selects or clears every addable result. */
	function setAll(checked: boolean) {
		selected.clear();
		if (checked) {
			for (const path of addablePaths) selected.add(path);
		}
	}

	/** Adds every selected, not-yet-added repository. */
	async function addSelected() {
		if (isAdding) return;

		const paths = addablePaths.filter((path) => selected.has(path));
		if (paths.length === 0) return;

		isAdding = true;
		let added = 0;
		const failures: Array<{ path: string; message: string }> = [];

		try {
			for (const path of paths) {
				try {
					await executeCommand('createRepository', { path });
					added += 1;
				} catch (error) {
					// Keep the reason around: a bare count tells the user nothing about
					// why a repository could not be added.
					failures.push({ path, message: getErrorMessage(error) });
				}
			}
		} finally {
			isAdding = false;
		}

		const failed = failures.map((failure) => failure.path);
		const failureLines = failures
			.map((failure) => `- \`${failure.path}\` — ${failure.message}`)
			.join('\n');

		if (added > 0) {
			// Repository queries are keyed by resource (`['repository', ...]`), so
			// invalidate that prefix — a plain `['getRepositoryList']` key never
			// matches and the sidebar list wouldn't refresh.
			queryClient.invalidateQueries({ queryKey: ['repository'] });

			// Mark the freshly added repos so the list reflects reality without a
			// re-scan, and drop them from the selection.
			const addedPaths = new SvelteSet(paths.filter((path) => !failed.includes(path)));
			results = results.map((item) =>
				addedPaths.has(item.path) ? { ...item, alreadyAdded: true } : item
			);
			for (const path of addedPaths) selected.delete(path);

			notifications.push({
				feedback: 'success',
				title: added === 1 ? 'Repository added' : 'Repositories added',
				message: `Added ${added} ${added === 1 ? 'repository' : 'repositories'}`
			});
			options.onAdded?.(added);
		}

		if (failures.length > 0) {
			// One toast per outcome, and the failure one carries the reason for each
			// path — a bare "N could not be added" left the user with no next step.
			notifications.push({
				feedback: 'danger',
				title: failures.length === 1 ? 'Could not add repository' : 'Could not add repositories',
				message:
					`${failures.length} ${failures.length === 1 ? 'repository' : 'repositories'} could not be added:\n\n` +
					failureLines
			});
		}
	}

	return {
		get results() {
			return results;
		},
		get scannedRoots() {
			return scannedRoots;
		},
		get hasScanned() {
			return hasScanned;
		},
		get isScanning() {
			return isScanning;
		},
		get progress() {
			return progress;
		},
		get isAdding() {
			return isAdding;
		},
		get selectedCount() {
			return selectedCount;
		},
		get addableCount() {
			return addablePaths.length;
		},
		isSelected(path: string) {
			return selected.has(path);
		},
		scan,
		cancelScan,
		toggle,
		setAll,
		addSelected
	};
}
