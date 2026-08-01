<script lang="ts">
	import Icon from '@iconify/svelte';
	import Button from '@pindoba/svelte-button';
	import Checkbox from '@pindoba/svelte-checkbox';
	import Loading from '@pindoba/svelte-loading';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createVirtualizer } from '@tanstack/svelte-virtual';
	import debounce from 'just-debounce-it';
	import { onDestroy, untrack } from 'svelte';
	import { get } from 'svelte/store';
	import { getSearchBranchesStore } from '../core/composables/search-branches.svelte';
	import BranchRecentCommits from '../features/commit-history/components/branch-recent-commits.svelte';
	import CommitGraphPreview from '../features/commit-history/components/commit-graph-preview.svelte';
	import {
		fetchCommitHistoryWindow,
		PREVIEW_WINDOW
	} from '../features/commit-history/infrastructure/queries/create-get-commit-history-window-query';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import LockBranchToggle from '$domains/branch-management/components/lock-branch-toggle.svelte';
	import { useBranchMetrics } from '$domains/branch-management/core/composables/use-branch-metrics.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { createSwitchBranchMutation } from '$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation';
	import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
	import {
		getBranchColorPalette,
		getBranchAlerts,
		getBranchElementId,
		shouldShowBranchAlerts
	} from '$domains/branch-management/utils/branch-utils';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { notifications } from '$services/notifications/notifications.svelte';
	import BranchCard from '$ui/core/branch-card.svelte';
	import { formatString } from '$utils/string-utils';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		repositoryID?: string;
		repositoryPath?: string;
		allowLocking?: boolean;
		allowSelection?: boolean;
		allowSetCurrent?: boolean;
		showAlerts?: boolean;
		variant?: 'default' | 'inverted';
	}

	const {
		repositoryID,
		repositoryPath,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true,
		variant = 'default',
		showAlerts = true
	}: Props = $props();

	const search = $derived(
		getSearchBranchesStore(
			`${repositoryID}-${page.url.pathname.includes('restore') ? 'deleted' : 'active'}`
		)
	);

	// Commit-card ↔ history integration: active branches get a deep-link into
	// the history view plus a hover preview of the graph around their tip.
	// Deleted branches don't — their commits may no longer be reachable.
	const queryClient = useQueryClient();
	const isRestoreView = $derived(page.url.pathname.includes('restore'));
	// Commit history (view, deep-link, hover preview) is gated behind a flag.
	const historyEnabled = $derived(isFeatureEnabled('commit-history'));
	// Diff review view (per-branch changed-files deep-link) has its own flag.
	const diffEnabled = $derived(isFeatureEnabled('branch-diff'));

	// Warm the preview's cache entry on hover so the popover usually opens
	// with data already there. Debounced so quick mouse travel costs nothing.
	let prefetchSha = '';
	const prefetchPreview = debounce(() => {
		if (!repositoryID || !repositoryPath || !prefetchSha) return;
		fetchCommitHistoryWindow(queryClient, {
			repoId: repositoryID,
			path: repositoryPath,
			targetSha: prefetchSha,
			...PREVIEW_WINDOW
		}).catch(() => {
			// Prefetch only; the preview surfaces errors when actually opened.
		});
	}, 200);

	function prefetchPreviewFor(sha: string) {
		prefetchSha = sha;
		prefetchPreview();
	}

	// A pending prefetch outliving the component would fire against a torn-down
	// query scope; just-debounce-it exposes .cancel for exactly this.
	onDestroy(() => prefetchPreview.cancel());

	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryID ?? '',
		filters: {
			deletionStatus: page.url.pathname.includes('restore')
				? ('deleted' as const)
				: ('active' as const),
			includeCurrent: true
		}
	}));

	// Unified mutation for selected branches
	const updateSelectionMutation = createUpdateBranchSelectionBatchMutation();

	const switchBranchMutation = createSwitchBranchMutation({
		onSuccess: ({ currentBranch }) => {
			notifications.push({
				title: 'Branch switched',
				message: `Successfully switched to branch **${currentBranch}**`,
				feedback: 'success'
			});

			// Remove from selected branches in database - invalidation happens automatically
			if (repositoryID) {
				updateSelectionMutation.mutate({
					repoId: repositoryID,
					branchNames: [currentBranch],
					isSelected: false
				});
			}
		}
	});

	function handleToggleSelect(branch: Branch) {
		if (!repositoryID) return;

		updateSelectionMutation.mutate({
			repoId: repositoryID,
			branchNames: [branch.getName()],
			isSelected: !branch.getIsSelected()
		});
	}

	function handleSwitchBranch(branch: string) {
		if (repositoryPath) {
			switchBranchMutation.mutate({
				path: repositoryPath,
				branch
			});
		}
	}

	let sortedBranches = $derived.by((): Branch[] | undefined => {
		const branches = branchesQuery.data?.branches;
		if (!branches) return undefined;

		return branches
			.toSorted((a, b) => {
				if (a.isCurrent() && !b.isCurrent()) return -1;
				if (!a.isCurrent() && b.isCurrent()) return 1;
				return 0;
			})
			.filter((branch) =>
				branch
					.getName()
					.toLowerCase()
					.includes(search?.state?.toLowerCase() ?? '')
			);
	});

	// ---------------------------------------------------------------------------
	// Virtualized, infinitely-scrolling list.
	//
	// The branch set arrives in one shot from git, so there is nothing to page
	// over the wire; the cost that used to justify pagination is per-row — every
	// card mounts its own merge-status and diff-stat queries. Windowing keeps
	// exactly the visible rows (plus overscan) mounted, so those queries fire as
	// the user scrolls instead of all at once, and the list stays one continuous
	// surface.
	// ---------------------------------------------------------------------------

	/** Rough card height (header + one-line commit + footer). Only seeds the
	 *  scrollbar — every mounted row reports its real height back. */
	const ESTIMATED_ROW_H = 148;
	/** Matches the `gap: md` rhythm the non-virtualized list used. */
	const ROW_GAP = 16;
	/** Rows mounted ahead of the viewport, in the direction of travel — the
	 *  runway a flick lands on before the window has caught up. */
	const OVERSCAN_LEAD = 16;
	/** Behind the viewport. Smaller, but never zero — a reversal has to land on
	 *  something too, and it keeps focus and hover popovers alive through a
	 *  scroll nudge. */
	const OVERSCAN_TRAIL = 6;
	/** Ceiling on the retained window (see `rangeExtractor`). Roughly 120 × 164px
	 *  ≈ 20 000px of standing list: past any single flick, but bounded so a repo
	 *  with a thousand branches can't turn the page into an unvirtualized one. */
	const MAX_MOUNTED_ROWS = 120;
	/** The scroll port's real height only lands once its ResizeObserver fires, a
	 *  frame after mount. Seeding from the window means the first paint is
	 *  already a full screen of branches instead of a blank flash that fills in;
	 *  innerHeight over-estimates the port by the surrounding chrome, which errs
	 *  toward one spare row rather than a blank strip. Reads `window` directly —
	 *  the app is ssr = false throughout (src/routes/+layout.ts). */
	const INITIAL_VIEWPORT = { width: 0, height: window.innerHeight };

	let scrollElement = $state<HTMLDivElement | null>(null);

	const branches = $derived(sortedBranches ?? []);
	const branchKey = (branch: Branch) => `${branch.getName()}-${branch.getLastCommit().getSha()}`;

	// ---------------------------------------------------------------------------
	// A growing window, not a sliding one.
	//
	// The default extractor mounts a fixed band around the viewport and unmounts
	// everything else, so a free-spinning wheel is a race: rows have to mount
	// faster than the scroll travels, and a branch row is not a `<div>` — it's a
	// card, a nested panel, badges, icons, a popover anchor and two query
	// observers. Lose that race and you see the spacer.
	//
	// So rows are never unmounted on the way past. Every index the viewport has
	// touched stays mounted, capped at MAX_MOUNTED_ROWS and evicted farthest-
	// first. Scrolling back over ground you've covered is then pure compositing —
	// no mounting, no measuring, no blank — and scrolling into new territory is
	// the only thing that costs anything, which is what "load more as you scroll"
	// should mean. Retained rows also keep their measured heights, so the total
	// size stops drifting and the scrollbar settles.
	//
	// Direction comes from the virtualizer's own scrollDirection, which is set
	// from real scroll deltas and null while idle. The extractor also re-runs on
	// measurement passes (a row reporting its height shifts startIndex), and a
	// range-history heuristic would read those shifts as travel and flip the
	// overscan asymmetry; latching the last non-null direction ignores them.
	// ---------------------------------------------------------------------------
	let scrollingForward = true;
	// Deliberately a plain Set, not a SvelteSet: the virtualizer already notifies
	// on every range change, and making this reactive would mean mutating tracked
	// state from inside a derivation the render pass is currently reading.
	// eslint-disable-next-line svelte/prefer-svelte-reactivity
	let mountedRows = new Set<number>();

	function resetMountedRows() {
		mountedRows = new Set();
	}

	function rangeExtractor(range: { startIndex: number; endIndex: number; count: number }) {
		const direction = get(virtualizer).scrollDirection;
		if (direction !== null) scrollingForward = direction === 'forward';
		const forward = scrollingForward;

		const start = Math.max(0, range.startIndex - (forward ? OVERSCAN_TRAIL : OVERSCAN_LEAD));
		const end = Math.min(
			range.count - 1,
			range.endIndex + (forward ? OVERSCAN_LEAD : OVERSCAN_TRAIL)
		);

		for (const index of mountedRows) {
			// The list can shrink under us (a filter, a refetch); drop anything the
			// count no longer covers before it becomes an out-of-bounds row.
			if (index >= range.count) mountedRows.delete(index);
		}
		for (let index = start; index <= end; index++) mountedRows.add(index);

		if (mountedRows.size > MAX_MOUNTED_ROWS) {
			// Evict by distance from the viewport: the rows most likely to be
			// needed again are the ones nearest to where the user is.
			const centre = (range.startIndex + range.endIndex) / 2;
			const byDistance = [...mountedRows].sort(
				(a, b) => Math.abs(a - centre) - Math.abs(b - centre)
			);
			mountedRows = new Set(byDistance.slice(0, MAX_MOUNTED_ROWS));
		}

		return [...mountedRows].sort((a, b) => a - b);
	}

	// `count` and `getScrollElement` are live getters rather than snapshots
	// because the svelte-virtual store re-applies *these* options every time it
	// gains its first subscriber — a plain `count: 0` seed would be re-imposed
	// during the first render and blank the list until the next frame.
	const virtualizerOptions = {
		get count() {
			return branches.length;
		},
		getScrollElement: () => scrollElement,
		estimateSize: () => ESTIMATED_ROW_H,
		overscan: OVERSCAN_TRAIL,
		rangeExtractor,
		gap: ROW_GAP,
		initialRect: INITIAL_VIEWPORT,
		/** Stable across filtering and refetches, so measured heights stay
		 *  attached to the branch they were measured from, not to a position. */
		getItemKey: (index: number) => {
			const branch = branches[index];
			return branch ? branchKey(branch) : index;
		}
	};

	const virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>(virtualizerOptions);

	// `.pre` matters: this has to land before the render pass reads the virtual
	// items, or the first paint of a changed list is computed from stale options.
	// get() reads the store without subscribing, so setOptions can't re-trigger
	// this effect.
	$effect.pre(() => {
		const count = branches.length;
		const element = scrollElement;
		get(virtualizer).setOptions({
			...virtualizerOptions,
			count,
			getScrollElement: () => element
		});
	});

	// The retained window is index-based, so any change to the list's identity —
	// a refetch after a deletion, the sort flipping after a branch switch, a
	// filter — re-means every index: retained far-away indices would keep
	// unrelated rows, and their query observers, alive. Fingerprint the keys and
	// drop the window whenever they change; the extractor repopulates it around
	// the current viewport in the same render pass, so visible rows never blank.
	// No scroll-to-top here — a background refetch mustn't yank the user.
	// `.pre` so the reset lands before the render pass reads the virtual items.
	let lastListFingerprint: string | undefined;
	$effect.pre(() => {
		const fingerprint = branches.map(branchKey).join('\u0000');
		if (fingerprint === lastListFingerprint) return;
		const isFirstRun = lastListFingerprint === undefined;
		lastListFingerprint = fingerprint;
		if (isFirstRun) return;
		resetMountedRows();
		// The virtualizer memoizes its index range on (extractor identity, count,
		// start, end) — none of which move when the list is rewritten in place —
		// so hand it a fresh extractor identity to force a recompute against the
		// now-empty retained set. The adapter's setOptions also notifies the
		// store, so the template re-reads the items in this same pass.
		get(virtualizer).setOptions({
			...virtualizerOptions,
			rangeExtractor: (range) => rangeExtractor(range)
		});
	});

	// A bulk selection change (select all / deselect all) flips `isSelected` on
	// nearly every branch at once. The list identity doesn't change (same
	// name-sha keys), so the fingerprint above doesn't fire — but every one of
	// the up-to-MAX_MOUNTED_ROWS retained rows would re-render in one flush:
	// new palette, checkbox state, and alert badges mounting per row. That
	// synchronous storm is what froze select-all on large repositories.
	// Collapsing the retained window back to the viewport turns ~120 full card
	// re-renders into ~25; rows past the viewport unmount (cheap) and remount
	// lazily as the user scrolls. Single toggles stay under the threshold and
	// keep the window intact.
	const BULK_SELECTION_RESET_THRESHOLD = OVERSCAN_LEAD + OVERSCAN_TRAIL + 8;
	let lastSelectionFingerprint: string | undefined;
	$effect.pre(() => {
		const fingerprint = branches.map((branch) => (branch.getIsSelected() ? '1' : '0')).join('');
		if (fingerprint === lastSelectionFingerprint) return;
		const previous = lastSelectionFingerprint;
		lastSelectionFingerprint = fingerprint;
		// First run, or the list itself changed shape (covered by the key
		// fingerprint above) — only compare like-for-like selection flips.
		if (previous === undefined || previous.length !== fingerprint.length) return;
		let flipped = 0;
		for (let i = 0; i < fingerprint.length; i++) {
			if (fingerprint[i] !== previous[i]) flipped++;
		}
		if (flipped <= BULK_SELECTION_RESET_THRESHOLD) return;
		resetMountedRows();
		// Fresh extractor identity for the same reason as the reset above.
		get(virtualizer).setOptions({
			...virtualizerOptions,
			rangeExtractor: (range) => rangeExtractor(range)
		});
	});

	// Filtering rewrites the list under a scroll offset that no longer means
	// anything — land the user back at the top of the new result set, and drop
	// the retained window with it: those indices point at different branches now.
	// Plain `let`, not `$state`: this is the effect's own bookkeeping, and making
	// it reactive would just have the effect re-trigger itself.
	let lastSearchTerm: string | undefined;
	$effect(() => {
		const term = search?.state ?? '';
		if (term === lastSearchTerm) return;
		const isFirstRun = lastSearchTerm === undefined;
		lastSearchTerm = term;
		if (isFirstRun) return;
		resetMountedRows();
		untrack(() => scrollElement)?.scrollTo({ top: 0 });
	});

	const virtualItems = $derived($virtualizer.getVirtualItems());
	const totalSize = $derived($virtualizer.getTotalSize());

	// ---------------------------------------------------------------------------
	// Per-card metrics (merge status + diff stats), batched.
	//
	// The retained window keeps up to MAX_MOUNTED_ROWS rows mounted, but only the
	// *visible* range needs metrics fetched — the virtualizer's raw range (before
	// the growing rangeExtractor widens it) is exactly that. The composable
	// debounces the range, maps it to position-aligned buckets, and runs one
	// bulk command per bucket instead of two commands per row.
	// ---------------------------------------------------------------------------
	const visibleRange = $derived($virtualizer.range);
	const branchMetrics = useBranchMetrics({
		path: () => repositoryPath,
		branchNames: () => branches.map((branch) => branch.getName()),
		visibleRange: () => visibleRange,
		// Deleted branches can't be measured (their ref is gone) — skip the
		// whole pipeline in the restore view.
		enabled: () => !isRestoreView
	});

	/** Registers a row with the virtualizer's ResizeObserver; the row's real
	 *  height replaces the estimate (and tracks it as cards expand). */
	function measureRow(node: HTMLDivElement) {
		get(virtualizer).measureElement(node);
	}

	// Hoisted out of the row loop: `css()` is a runtime merge, and calling it per
	// row per frame is real work in the one place that can't afford any.
	const rowClass = css({
		position: 'absolute',
		top: '0',
		left: '0',
		width: 'full',
		display: 'grid',
		gap: 'xs',
		borderRadius: 'sm',
		borderTopLeftRadius: 0
	});
	const cardCellClass = css({ minWidth: '0' });
</script>

<!-- Surface comes from the enclosing PageWell, which is unpadded for this view:
     the inset is the scroll port's own padding, so cards travel all the way to
     the well's edges and the scrollbar rides that edge instead of floating in a
     gutter. -->
<!-- The scroll port is a focus stop (WCAG 2.1.1: scrollable regions must be
     keyboard-reachable); once focusable, the browser scrolls it natively with
     Arrow/PageUp/PageDown/Home/End, so no key handling is needed. The region
     role names the stop for AT without disturbing the inner list semantics. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
	bind:this={scrollElement}
	data-testid="branch-list-scroller"
	role="region"
	aria-label="Branch list"
	tabindex="0"
	class={css({
		flex: '1',
		minHeight: '0',
		overflowY: 'auto',
		overflowX: 'hidden',
		padding: 'md',
		_focusVisible: {
			outline: '2px solid token(colors.primary.border)',
			outlineOffset: '-2px'
		}
	})}
>
	<div
		role="list"
		aria-busy={branchesQuery.isLoading}
		class={css({
			position: 'relative',
			zIndex: '0',
			width: 'full'
		})}
		style:height={`${totalSize}px`}
	>
		{#each virtualItems as virtualRow (virtualRow.key)}
			{@const branch = branches[virtualRow.index]}
			{#if branch}
				{@const metrics = branch.isCurrent()
					? undefined
					: branchMetrics.getMetrics(branch.getName())}
				{@const alerts = getBranchAlerts(
					branch,
					branch.getIsSelected() ?? false,
					metrics?.isMerged
				)}
				{@const hasAlerts = showAlerts && shouldShowBranchAlerts(alerts, branch)}
				<!-- The card column is `minmax(0, 1fr)`, not a bare `1fr`: a `1fr`
				     track floors at its content's min width, so one long unbroken
				     commit line would widen the row past the list instead of
				     ellipsizing inside it. -->
				<div
					role="listitem"
					aria-setsize={branches.length}
					aria-posinset={virtualRow.index + 1}
					data-index={virtualRow.index}
					use:measureRow
					class={rowClass}
					class:selected={branch.getIsSelected()}
					style:grid-template-columns={branch.isCurrent()
						? 'minmax(0, 1fr)'
						: 'auto minmax(0, 1fr)'}
					style:transform={`translateY(${virtualRow.start}px)`}
				>
					{#if !branch.isCurrent()}
						<div
							class={css({
								display: 'flex',
								flexDirection: 'column',
								gap: 'xs'
							})}
						>
							{#if allowSelection && !branch.getIsLocked()}
								<Checkbox
									size="lg"
									id={`checkbox-${branch.getName()}`}
									onclick={() => handleToggleSelect(branch)}
									checked={branch.getIsSelected()}
									disabled={branch.getIsLocked()}
								>
									<div class={visuallyHidden()}>
										{branch.getName()}
									</div>
								</Checkbox>
							{/if}

							{#if allowSetCurrent}
								<Loading
									loading={switchBranchMutation.variables?.branch === branch.getName() &&
										switchBranchMutation.isPending}
								>
									<Tooltip content="Set as current">
										{#snippet children(triggerProps)}
											<Button
												size="xs"
												shape="square"
												emphasis="secondary"
												disabled={switchBranchMutation.variables?.branch !== branch.getName() &&
													switchBranchMutation.isPending}
												class={css({
													width: '24px',
													height: '24px'
												})}
												onclick={() => handleSwitchBranch(branch.getName())}
												data-testid="switch-button"
												{...triggerProps}
											>
												<Stamp emphasis="ghost" border="none" background="transparent">
													<Icon icon="lucide:map-pin" width="14px" height="14px" />
												</Stamp>
												<span class={visuallyHidden()}>Set as current</span>
											</Button>
										{/snippet}
									</Tooltip>
								</Loading>
							{/if}

							{#if allowLocking}
								<LockBranchToggle {repositoryID} branch={branch.getName()} />
							{/if}
						</div>
					{/if}

					{#snippet commitPreview()}
						{#if repositoryID && repositoryPath}
							<CommitGraphPreview
								repoId={repositoryID}
								path={repositoryPath}
								sha={branch.getLastCommit().getSha()}
							/>
						{/if}
					{/snippet}
					{#snippet recentCommits()}
						{#if repositoryID && repositoryPath}
							<BranchRecentCommits
								repoId={repositoryID}
								path={repositoryPath}
								branch={branch.getName()}
							/>
						{/if}
					{/snippet}
					<div
						role="presentation"
						class={cardCellClass}
						onmouseenter={historyEnabled && !isRestoreView && repositoryPath
							? () => prefetchPreviewFor(branch.getLastCommit().getSha())
							: undefined}
					>
						<BranchCard
							{branch}
							diffStats={metrics
								? { linesAdded: metrics.linesAdded, linesRemoved: metrics.linesRemoved }
								: undefined}
							diffStatsLoading={!metrics &&
								!branch.isCurrent() &&
								!isRestoreView &&
								branchMetrics.isLoading}
							selected={branch.getIsSelected()}
							locked={branch.getIsLocked() && !branch.isCurrent()}
							colorPalette={getBranchColorPalette(branch, branch.getIsSelected() ?? false)}
							id={getBranchElementId(branch.getName(), 'container')}
							title={branch.isCurrent()
								? 'Current branch'
								: formatString('{name}', { name: branch.getName() })}
							{variant}
							commitHistoryHref={historyEnabled && !isRestoreView && repositoryID
								? `${resolve(`/repos/${repositoryID}/history`)}?commit=${branch.getLastCommit().getSha()}`
								: undefined}
							diffHref={diffEnabled && !isRestoreView && !branch.isCurrent() && repositoryID
								? `${resolve(`/repos/${repositoryID}/diff`)}?branch=${encodeURIComponent(branch.getName())}`
								: undefined}
							commitDiffHref={diffEnabled && !isRestoreView && repositoryID
								? `${resolve(`/repos/${repositoryID}/diff`)}?commit=${branch.getLastCommit().getSha()}`
								: undefined}
							commitHoverPreview={historyEnabled && !isRestoreView && repositoryID && repositoryPath
								? commitPreview
								: undefined}
							recentCommits={historyEnabled && !isRestoreView && repositoryID && repositoryPath
								? recentCommits
								: undefined}
							children={hasAlerts ? branchAlertsContent : undefined}
						/>
						{#snippet branchAlertsContent()}
							<BranchAlerts {alerts} {branch} />
						{/snippet}
					</div>
				</div>
			{/if}
		{/each}
	</div>
</div>
