/**
 * Commit History View Composable
 *
 * Orchestrates the history view's server state (cursor-paged commit walk,
 * repository, branches, lazy comparisons), the incremental graph layout, the
 * collapse model, the selection bridge into the shared branch-selection
 * cache, and the `?commit=<sha>` deep-link reveal flow.
 *
 * Layout is deliberately NOT a `$derived` over all loaded commits: pages are
 * appended once into a resumable `GraphBuilder`, and `rows` is a `$state.raw`
 * array of frozen row objects — appending a page is O(page) and never
 * recomputes or re-proxies older rows.
 */

import { useQueryClient } from '@tanstack/svelte-query';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';
import { useBranchComparisons } from './use-branch-comparisons.svelte';
import type { Branch } from '$domains/branch-management/core/models/branch';
import { fetchCommitLocation } from '$domains/branch-management/features/commit-history/infrastructure/queries/create-get-commit-history-window-query';
import { createListCommitHistoryInfiniteQuery } from '$domains/branch-management/features/commit-history/infrastructure/queries/create-list-commit-history-infinite-query';
import {
	buildDisplay,
	createGraphBuilder,
	type DisplayItem,
	type GraphRow
} from '$domains/branch-management/features/commit-history/models/commit-graph';
import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation';
import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
import { createGetRepositoryQuery } from '$domains/branch-management/infrastructure/queries/create-get-repository-query';
import type { AppError } from '$infrastructure/bindings';

/** Runs of this many consecutive non-head commits collapse into one row. */
export const COLLAPSE_MIN = 2;
/** Start fetching the next page when the viewport is this close to the end. */
const LOAD_MORE_THRESHOLD = 8;
/** Deep-link auto-loading gives up beyond this depth (avoids paging forever). */
const REVEAL_DEPTH_CAP = 50_000;

/** A pending deep-link scroll: resolved to a display row by the list. */
export interface PendingReveal {
	sha: string;
	commitIndex: number;
}

interface UseCommitHistoryViewProps {
	getId: () => string;
	/** `?commit=<sha>` from the route; null when absent. */
	getTargetCommit: () => string | null;
}

export function useCommitHistoryView({ getId, getTargetCommit }: UseCommitHistoryViewProps) {
	const queryClient = useQueryClient();

	// --- Server state -------------------------------------------------------

	const repositoryQuery = createGetRepositoryQuery(() => getId(), {
		enabled: () => !!getId()
	});
	const path = $derived(repositoryQuery.data?.path);

	const historyQuery = createListCommitHistoryInfiniteQuery(() => ({
		repoId: getId(),
		path: path ?? ''
	}));

	const branchesQuery = createGetBranchesQuery(
		() => ({
			repoId: getId() ?? '',
			filters: { deletionStatus: 'active', includeCurrent: true }
		}),
		{ enabled: () => !!getId() }
	);

	const selectionMutation = createUpdateBranchSelectionBatchMutation();

	// Branch names visible in the gutter, reported by the list component;
	// feeds the lazy comparison batches.
	let visibleBranchNames = $state<string[]>([]);

	const comparisons = useBranchComparisons({
		getRepoId: () => getId(),
		getPath: () => path,
		getVisibleBranchNames: () => visibleBranchNames
	});

	// --- Incremental layout ---------------------------------------------------

	let builder = createGraphBuilder();
	let rows = $state.raw<GraphRow[]>([]);
	let laneCount = $state(0);
	let processedPages = 0;
	let lastDataStamp = 0;

	const loadedCommitCount = () =>
		(historyQuery.data?.pages ?? []).reduce((n, page) => n + page.commits.length, 0);

	$effect(() => {
		const pages = historyQuery.data?.pages ?? [];
		const stamp = historyQuery.dataUpdatedAt;

		// A refetch/invalidation replaces existing pages wholesale (same or
		// smaller page count, new timestamp): relayout from scratch.
		if (stamp !== lastDataStamp && pages.length <= processedPages) {
			builder = createGraphBuilder();
			rows = [];
			processedPages = 0;
		}
		lastDataStamp = stamp;

		if (pages.length > processedPages) {
			const appended = pages.slice(processedPages).flatMap((page) => builder.append(page.commits));
			rows = [...rows, ...appended];
			processedPages = pages.length;
			laneCount = builder.laneCount;
		}
	});

	// --- Collapse model -------------------------------------------------------

	const expanded = new SvelteSet<string>();
	const display: DisplayItem[] = $derived.by(() => buildDisplay(rows, expanded, COLLAPSE_MIN));

	function toggleGroup(groupId: string) {
		if (expanded.has(groupId)) {
			expanded.delete(groupId);
		} else {
			expanded.add(groupId);
		}
	}

	function expandGroup(groupId: string) {
		expanded.add(groupId);
	}

	// --- Selection bridge -------------------------------------------------------
	// The gutter checkboxes read and write the SAME cache-backed selection the
	// DeleteBranchModal consumes, so the modal's count/confirm flow works
	// unchanged from this view.

	const branchByName = $derived(
		new SvelteMap((branchesQuery.data?.branches ?? []).map((branch) => [branch.getName(), branch]))
	);
	const selectedCount = $derived(
		(branchesQuery.data?.branches ?? []).filter((branch) => branch.getIsSelected()).length
	);

	/** Branch domain model from the shared branches cache — lets the gutter
	 *  render the SAME compact BranchCard the rest of the app uses. Undefined
	 *  while the cache loads or when the ref is unknown to it. */
	function getBranch(name: string): Branch | undefined {
		return branchByName.get(name);
	}

	function isSelected(name: string): boolean {
		return branchByName.get(name)?.getIsSelected() ?? false;
	}

	/** Only non-current, unlocked branches may be selected for deletion. */
	function isSelectable(name: string): boolean {
		const branch = branchByName.get(name);
		if (!branch) return false;
		return !branch.isCurrent() && !branch.getIsLocked();
	}

	function toggleBranchSelection(name: string) {
		if (!isSelectable(name)) return;
		selectionMutation.mutate({
			repoId: getId(),
			branchNames: [name],
			isSelected: !isSelected(name)
		});
	}

	// --- Paging -----------------------------------------------------------------

	function loadMoreIfNeeded(lastVisibleCommitIndex: number) {
		if (!historyQuery.hasNextPage || historyQuery.isFetchingNextPage) return;
		if (lastVisibleCommitIndex >= loadedCommitCount() - LOAD_MORE_THRESHOLD) {
			void historyQuery.fetchNextPage();
		}
	}

	/** Refs changed mid-scroll (`history_cursor_stale`): offer a restart. */
	const isStale = $derived(
		(historyQuery.error as AppError | null)?.kind === 'history_cursor_stale'
	);

	function reload() {
		builder = createGraphBuilder();
		rows = [];
		laneCount = 0;
		processedPages = 0;
		comparisons.reset();
		void queryClient.resetQueries({ queryKey: ['commit-history'] });
	}

	// --- Deep-link (?commit=<sha>) -----------------------------------------------

	let pendingReveal = $state<PendingReveal | null>(null);
	let highlightSha = $state<string | null>(null);
	let deepLinkError = $state<AppError | null>(null);
	let lastRevealTarget: string | null = null;

	async function revealCommit(sha: string) {
		const repoPath = path;
		if (!repoPath) return;
		deepLinkError = null;

		try {
			const location = await fetchCommitLocation(queryClient, {
				repoId: getId(),
				path: repoPath,
				targetSha: sha
			});

			if (location.targetIndex > REVEAL_DEPTH_CAP) {
				deepLinkError = {
					message: `Commit ${sha.slice(0, 7)} is too deep in history to auto-load`,
					kind: 'commit_too_deep',
					description: `The commit sits ${location.targetIndex.toLocaleString()} commits into the walk; scroll manually to reach it.`
				};
				return;
			}

			while (loadedCommitCount() <= location.targetIndex && historyQuery.hasNextPage) {
				await historyQuery.fetchNextPage();
			}
			pendingReveal = { sha, commitIndex: location.targetIndex };
		} catch (error) {
			deepLinkError = error as AppError;
		}
	}

	// Trigger the reveal once per target (initial load and URL changes).
	$effect(() => {
		const target = getTargetCommit();
		if (!target || !path || target === lastRevealTarget) return;
		lastRevealTarget = target;
		void revealCommit(target);
	});

	/** The list calls this once it scrolled to the revealed row. */
	function completeReveal() {
		if (!pendingReveal) return;
		highlightSha = pendingReveal.sha;
		pendingReveal = null;
	}

	function clearHighlight() {
		highlightSha = null;
	}

	function dismissDeepLinkError() {
		deepLinkError = null;
	}

	return {
		// layout + display
		get display() {
			return display;
		},
		get laneCount() {
			return laneCount;
		},
		get loadedCommitCount() {
			return loadedCommitCount();
		},
		get totalCount() {
			return historyQuery.data?.pages[0]?.totalCount ?? 0;
		},
		toggleGroup,
		expandGroup,
		get expanded() {
			return expanded;
		},

		// repository + signals
		get repository() {
			return repositoryQuery.data;
		},
		get path() {
			return path;
		},
		get comparisons() {
			return comparisons;
		},
		set visibleBranchNames(names: string[]) {
			visibleBranchNames = names;
		},

		// selection bridge
		get selectedCount() {
			return selectedCount;
		},
		getBranch,
		isSelected,
		isSelectable,
		toggleBranchSelection,

		// paging + staleness
		loadMoreIfNeeded,
		get hasNextPage() {
			return historyQuery.hasNextPage;
		},
		get isFetchingNextPage() {
			return historyQuery.isFetchingNextPage;
		},
		get isStale() {
			return isStale;
		},
		reload,

		// deep-link
		get pendingReveal() {
			return pendingReveal;
		},
		get highlightSha() {
			return highlightSha;
		},
		get deepLinkError() {
			return deepLinkError;
		},
		completeReveal,
		clearHighlight,
		dismissDeepLinkError,

		// query states
		get isLoading() {
			return historyQuery.isLoading;
		},
		get isError() {
			return historyQuery.isError && !isStale;
		},
		get error() {
			return (historyQuery.error as AppError | null) ?? null;
		}
	};
}
