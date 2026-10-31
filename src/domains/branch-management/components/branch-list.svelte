<script lang="ts">
	import LucideCloud from '@lucide/svelte/icons/cloud';
	import LucideCloudOff from '@lucide/svelte/icons/cloud-off';
	import LucideFileDiff from '@lucide/svelte/icons/file-diff';
	import LucideGitBranch from '@lucide/svelte/icons/git-branch';
	import LucideHistory from '@lucide/svelte/icons/history';
	import LucideLock from '@lucide/svelte/icons/lock';
	import LucideMapPin from '@lucide/svelte/icons/map-pin';
	import Badge from '@pindoba/svelte-badge';
	import Button from '@pindoba/svelte-button';
	import GridList from '@pindoba/svelte-grid-list';
	import Loading from '@pindoba/svelte-loading';
	import Popover from '@pindoba/svelte-popover';
	import Stamp from '@pindoba/svelte-stamp';
	import Tooltip from '@pindoba/svelte-tooltip';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { onDestroy, untrack } from 'svelte';
	import { getSearchBranchesStore } from '../core/composables/search-branches.svelte';
	import CommitGraphPreview from '../features/commit-history/components/commit-graph-preview.svelte';
	import {
		fetchCommitHistoryWindow,
		PREVIEW_WINDOW
	} from '../features/commit-history/infrastructure/queries/create-get-commit-history-window-query';
	import { page } from '$app/state';
	import BranchAlerts from '$domains/branch-management/components/branch-alerts.svelte';
	import LockBranchToggle from '$domains/branch-management/components/lock-branch-toggle.svelte';
	import { useBranchMetrics } from '$domains/branch-management/core/composables/use-branch-metrics.svelte';
	import { type Branch } from '$domains/branch-management/core/models/branch';
	import { createSwitchBranchMutation } from '$domains/branch-management/infrastructure/mutations/create-switch-branch-mutation';
	import { createUpdateBranchSelectionBatchMutation } from '$domains/branch-management/infrastructure/mutations/create-update-branch-selection-batch-mutation';
	import { createGetBranchesQuery } from '$domains/branch-management/infrastructure/queries/create-get-branches-query';
	import {
		getBranchAlerts,
		getBranchElementId,
		shouldShowBranchAlerts
	} from '$domains/branch-management/utils/branch-utils';
	import { filterBranchesBySearch } from '$domains/branch-management/utils/filter-branches-by-search';
	import { isFeatureEnabled } from '$lib/feature-flags.svelte';
	import { resolveRepositorySubPath } from '$lib/repository-route';
	import { notifications } from '$services/notifications/notifications.svelte';
	import Icon from '$ui/core/icon.svelte';
	import { safeFormatDate, safeFormatRelativeDate } from '$utils/date-utils';
	import { css } from '@pindoba/styled-system/css';
	import { visuallyHidden } from '@pindoba/styled-system/patterns';

	interface Props {
		repositoryID?: string;
		repositoryPath?: string;
		allowLocking?: boolean;
		allowSelection?: boolean;
		allowSetCurrent?: boolean;
		showAlerts?: boolean;
		/** Bindable: the list's root (its scroll port), e.g. for a bulk bar's
		 *  `returnFocus` via `gridListFocusTarget`. */
		element?: HTMLDivElement | null;
	}

	let {
		repositoryID,
		repositoryPath,
		allowLocking = true,
		allowSelection = true,
		allowSetCurrent = true,
		showAlerts = true,
		element = $bindable()
	}: Props = $props();

	const isRestoreView = $derived(page.url.pathname.includes('restore'));
	const search = $derived(
		getSearchBranchesStore(`${repositoryID}-${isRestoreView ? 'deleted' : 'active'}`)
	);

	// Deep-links per row, each behind its own flag. Deleted branches get
	// neither — their commits may no longer be reachable.
	const historyEnabled = $derived(isFeatureEnabled('commit-history') && !isRestoreView);
	const diffEnabled = $derived(isFeatureEnabled('branch-diff') && !isRestoreView);

	const branchesQuery = createGetBranchesQuery(() => ({
		repoId: repositoryID ?? '',
		filters: {
			deletionStatus: isRestoreView ? ('deleted' as const) : ('active' as const),
			includeCurrent: true
		}
	}));

	const updateSelectionMutation = createUpdateBranchSelectionBatchMutation();

	const switchBranchMutation = createSwitchBranchMutation({
		onSuccess: ({ currentBranch }) => {
			notifications.push({
				title: 'Branch switched',
				message: `Successfully switched to branch **${currentBranch}**`,
				feedback: 'success'
			});

			// The new current branch can't stay selected for deletion.
			if (repositoryID) {
				updateSelectionMutation.mutate({
					repoId: repositoryID,
					branchNames: [currentBranch],
					isSelected: false
				});
			}
		}
	});

	function handleSwitchBranch(branch: string) {
		if (repositoryPath) {
			switchBranchMutation.mutate({ path: repositoryPath, branch });
		}
	}

	const branches = $derived.by((): Branch[] => {
		const all = branchesQuery.data?.branches;
		if (!all) return [];

		const sorted = all.toSorted((a, b) => Number(b.isCurrent()) - Number(a.isCurrent()));
		// Same trimming/matching as the view-level filter, so the list never
		// disagrees with the "N found" header or the empty state.
		return filterBranchesBySearch(sorted, search?.state);
	});

	// ---------------------------------------------------------------------------
	// Selection. It lives in the database (it survives restarts and drives the
	// delete/restore dialogs), so the list is controlled: GridList reports the
	// next set and the difference goes out as at most two batch writes.
	// ---------------------------------------------------------------------------
	const selected = $derived(
		new Set(branches.filter((branch) => branch.getIsSelected()).map((b) => b.getName()))
	);
	// The current branch can't be deleted and a locked one is protected until
	// unlocked: both stay visible but never join a selection.
	const disabledIds = $derived(
		new Set(
			branches
				.filter((branch) => branch.isCurrent() || branch.getIsLocked())
				.map((b) => b.getName())
		)
	);

	function handleSelectionChange(next: Set<string>) {
		if (!repositoryID) return;
		const added = [...next].filter((name) => !selected.has(name));
		const removed = [...selected].filter((name) => !next.has(name));
		if (added.length > 0) {
			updateSelectionMutation.mutate({
				repoId: repositoryID,
				branchNames: added,
				isSelected: true
			});
		}
		if (removed.length > 0) {
			updateSelectionMutation.mutate({
				repoId: repositoryID,
				branchNames: removed,
				isSelected: false
			});
		}
	}

	// ---------------------------------------------------------------------------
	// Merge status + diff stats, fetched only for the rows on screen. GridList
	// mounts a window of rows (plus overscan), and the metrics cost a git walk
	// each, so the list reports which rows are on screen and the composable
	// batches those into bucketed bulk queries.
	// ---------------------------------------------------------------------------
	let visibleRange = $state<{ startIndex: number; endIndex: number } | null>(null);

	function handleVisibleRangeChange({
		startIndex,
		endIndex
	}: {
		startIndex: number;
		endIndex: number;
	}) {
		// A screen ahead too, so stats are usually there before a row is.
		visibleRange = { startIndex, endIndex: endIndex + (endIndex - startIndex + 1) };
	}

	const queryClient = useQueryClient();
	const branchMetrics = useBranchMetrics({
		path: () => repositoryPath,
		branchNames: () => branches.map((branch) => branch.getName()),
		visibleRange: () => visibleRange,
		// Deleted branches can't be measured (their ref is gone).
		enabled: () => !isRestoreView,
		// Fill in the whole list behind the viewport, so scrolling lands on rows
		// whose counts are already there.
		queryClient
	});

	// ---------------------------------------------------------------------------
	// Commit graph preview. Resting on a commit subject opens a small graph of
	// the history around that commit. One popover serves the whole list: it
	// moves to whichever subject was hovered, instead of every row mounting
	// its own.
	// ---------------------------------------------------------------------------
	/** How long the pointer rests on a subject before the preview opens —
	 *  long enough that sweeping across rows doesn't flash previews. */
	const PREVIEW_OPEN_DELAY = 350;
	/** Grace period to move the pointer from the subject into the preview. */
	const PREVIEW_CLOSE_DELAY = 150;

	let preview = $state<{ anchor: HTMLElement; sha: string } | null>(null);
	let previewOpen = $state(false);
	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	function clearPreviewTimers() {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
	}

	function hoverSubject(anchor: HTMLElement, sha: string) {
		if (!historyEnabled || !repositoryID || !repositoryPath) return;
		clearPreviewTimers();
		// Warm the cache while the pointer rests, so the popover usually opens
		// with its graph already there. Prefetch only: the preview surfaces
		// errors itself when opened.
		fetchCommitHistoryWindow(queryClient, {
			repoId: repositoryID,
			path: repositoryPath,
			targetSha: sha,
			...PREVIEW_WINDOW
		}).catch(() => {});
		openTimer = setTimeout(() => {
			// The row may have scrolled out of the virtual window meanwhile.
			if (!anchor.isConnected) return;
			preview = { anchor, sha };
			previewOpen = true;
		}, PREVIEW_OPEN_DELAY);
	}

	function leavePreview() {
		clearPreviewTimers();
		closeTimer = setTimeout(() => (previewOpen = false), PREVIEW_CLOSE_DELAY);
	}

	function enterPreview() {
		clearTimeout(closeTimer);
	}

	// A virtual row that scrolls out of the window is unmounted, and a removed
	// element never fires `mouseleave` — the preview would stay open pointing
	// at nothing. Close it once its subject is gone or out of the scroll port.
	// Checked a frame after the scroll, once the virtualizer has re-rendered.
	let scrollFrame = 0;
	function handleListScroll(event: Event) {
		if (!previewOpen) return;
		// Captured on the list wrapper, so the target is always an element.
		const port = event.target as Element;
		cancelAnimationFrame(scrollFrame);
		scrollFrame = requestAnimationFrame(() => {
			const anchor = preview?.anchor;
			if (!anchor?.isConnected || !isInside(anchor, port)) {
				clearPreviewTimers();
				previewOpen = false;
			}
		});
	}

	function isInside(anchor: Element, port: Element) {
		const a = anchor.getBoundingClientRect();
		const p = port.getBoundingClientRect();
		return a.bottom > p.top && a.top < p.bottom;
	}

	onDestroy(() => {
		clearPreviewTimers();
		cancelAnimationFrame(scrollFrame);
	});

	// ---------------------------------------------------------------------------
	// Row actions. The hover cell (switch, lock, diff, history) is most of a
	// row's weight — a tooltip, button and their effects per action — and it
	// only shows while the row is hovered or holds the focus. So it mounts for
	// that row alone: rows scrolling past stay light. GridList finds a row's
	// controls when a key asks for them, and the focus lands on the row first,
	// which mounts them.
	// ---------------------------------------------------------------------------
	let hoveredRow = $state<string | null>(null);
	let focusedRow = $state<string | null>(null);

	function rowIdOf(target: EventTarget | null): string | null {
		return target instanceof Element
			? (target.closest<HTMLElement>('[data-row-id]')?.dataset.rowId ?? null)
			: null;
	}

	function handleFocusOut(event: FocusEvent) {
		const { currentTarget, relatedTarget } = event;
		if (!(relatedTarget instanceof Node) || !(currentTarget as Node).contains(relatedTarget)) {
			focusedRow = null;
		}
	}

	// Filtering rewrites the list under a scroll offset that no longer means
	// anything: land back at the top of the new result set.
	let lastSearchTerm: string | undefined;
	$effect(() => {
		const term = search?.state ?? '';
		if (term === lastSearchTerm) return;
		const isFirstRun = lastSearchTerm === undefined;
		lastSearchTerm = term;
		if (isFirstRun) return;
		// The grid inside the root is the scroll port (`scroll` mode).
		untrack(() => element)
			?.querySelector('[role="grid"]')
			?.scrollTo({ top: 0 });
	});

	/** Five digits and up read as `12K`: the changes column has a fixed
	 *  width, so the row never reflows when a big diff lands. */
	const compactCount = new Intl.NumberFormat('en', { notation: 'compact' });
	function formatLineCount(count: number): string {
		return count < 10_000 ? String(count) : compactCount.format(count);
	}

	/** A two-line row (65px) plus the cards look's gap (2px), as measured in
	 *  the app. Every mounted row reports its own height, but rows not yet
	 *  rendered are placed by this: too high and a fast jump lands on the
	 *  wrong rows while the scrollbar shrinks under the pointer. */
	const ESTIMATED_ROW_HEIGHT = 67;

	/** Rows rendered past each end of the view (GridList's default is 6).
	 *  Rows are light now that their actions mount on hover, so a deep buffer
	 *  is cheap per frame, and it is what a fast flick scrolls into before
	 *  the next render catches up. Arrival mounts the narrower one, so the
	 *  list opens fast; once it has settled the buffer widens, mounting the
	 *  extra rows while nobody is scrolling. */
	const OVERSCAN_ON_ARRIVAL = 12;
	const OVERSCAN_SETTLED = 24;
	const OVERSCAN_WIDEN_DELAY = 600;

	let overscan = $state(OVERSCAN_ON_ARRIVAL);
	$effect(() => {
		const timer = setTimeout(() => (overscan = OVERSCAN_SETTLED), OVERSCAN_WIDEN_DELAY);
		return () => clearTimeout(timer);
	});

	// Where a flick outruns even that buffer, the spacers standing in for
	// unrendered rows draw rows still loading instead of a blank well: per
	// ESTIMATED_ROW_HEIGHT tile, bars where the name, the author line, the
	// commit subject and the date sit, over the row fill (65px) and the gap.
	// Bands are painted within each 67px tile, so they repeat with the rows.
	const spacerStyle = css.raw({
		// One literal: Panda extracts static values only.
		backgroundImage:
			'linear-gradient(to bottom, transparent 13px, token(colors.neutral.border.muted) 13px 23px, transparent 23px), linear-gradient(to bottom, transparent 43px, token(colors.neutral.border.muted) 43px 51px, transparent 51px), linear-gradient(to bottom, transparent 17px, token(colors.neutral.border.muted) 17px 27px, transparent 27px), linear-gradient(to bottom, transparent 17px, token(colors.neutral.border.muted) 17px 27px, transparent 27px), linear-gradient(to bottom, var(--gl-row-bg) 65px, transparent 65px)',
		backgroundSize: '180px 67px, 120px 67px, 26% 67px, 64px 67px, 100% 67px',
		// The subject column starts at about 37% of the row: 50% of the room
		// a 26%-wide bar leaves. The date is right-aligned.
		backgroundPosition: '76px 0, 76px 0, 50% 0, right 16px top 0, 0 0',
		backgroundRepeat: 'repeat-y',
		// The leading spacer's sizer spans every row: it paints the well colour
		// behind them (the gaps between cards), with the scrolled content. See
		// the port's backdrop below. It starts at the first row, so it reaches
		// up under the sticky header to cover the gap above that row too.
		'&[data-grid-list-spacer-lead]::after': {
			visibility: 'visible',
			left: '0',
			right: '0',
			width: 'auto',
			marginTop: '-64px',
			height: 'calc(var(--gl-virtual-total, 0px) + 64px + var(--gl-scroll-end-inset, 0px))',
			background: 'neutral.surface.ground',
			zIndex: '-1'
		}
	});

	// A real flick scrolls on WebKit's scrolling thread, ahead of the main
	// thread drawing the rows' tiles, and the transparent port let the
	// near-black well show through wherever they were still missing (even a
	// plain scroll box does this in WKWebView). The port's own fill stays
	// behind its scrolled tiles, so it is the row fill: an undrawn stretch
	// reads as cards still loading. The well colour between the cards comes
	// from the sizer above instead, drawn with the rows. Not a `local`
	// background layer: one of those moves the whole background into the
	// scrolled tiles. Clipped to the content box, so it stays off the
	// scrollbar's gap; `isolation` keeps the sizer's -1 above it.
	const scrollPortStyle = css.raw({
		backgroundColor: 'var(--gl-row-bg)',
		backgroundClip: 'content-box',
		isolation: 'isolate'
	});

	// Room for the last row to scroll out from under the well's bulk bar, only
	// while the bar is up (it shows for a selection). Always on, it gave a list
	// that fits a scrollbar and a stretch of empty space to scroll through.
	const barClearanceClass = css({
		'--gl-scroll-end-inset': 'var(--page-well-overlay-clearance, 0px)'
	});

	// Hoisted: `css()` is a runtime merge, not worth repeating per row.
	const twoLineCellClass = css({ display: 'grid', gap: '3xs', minWidth: '0' });
	const lineClass = css({ display: 'flex', alignItems: 'center', gap: 'xs', minWidth: '0' });
	const statusCellClass = css({ justifyContent: 'center', color: 'neutral.text.muted' });
	const nameClass = css({ fontWeight: 'semibold', truncate: true });
	const mutedClass = css({ fontSize: 'sm', color: 'neutral.text.muted', truncate: true });
	const shaClass = css({
		flexShrink: '0',
		fontSize: 'xs',
		fontFamily: 'mono',
		color: 'neutral.text.muted'
	});
	const subjectClass = css({ fontSize: 'sm', truncate: true });
	const statsCellClass = css({ gap: '3xs', justifyContent: 'flex-end' });
	const dateCellClass = css({
		justifyContent: 'flex-end',
		fontSize: 'sm',
		color: 'neutral.text.muted',
		whiteSpace: 'nowrap'
	});
	const actionsCellClass = css({ gap: '3xs', justifyContent: 'flex-end' });
</script>

<!-- Surface comes from the enclosing PageWell, which is unpadded for this view.
     The list is its own scroll port, so the sticky header pins to the list's
     top edge (flush under the toolbar) and rows scroll under it, never above
     it. The sides and bottom are the port's own padding, so rows travel to
     the well's edges and the scrollbar rides that edge. -->
<div
	role="presentation"
	class={css({
		display: 'flex',
		flexDirection: 'column',
		flex: '1',
		minHeight: '0'
	})}
	onpointerover={(event) => (hoveredRow = rowIdOf(event.target))}
	onpointerleave={() => (hoveredRow = null)}
	onfocusin={(event) => (focusedRow = rowIdOf(event.target))}
	onfocusout={handleFocusOut}
	onscrollcapture={handleListScroll}
>
	<!-- The sticky header carries select-all (it covers the selectable rows
	     the search leaves; ⌘A does the same from a focused row). Narrower than
	     640px the commit subject drops and each row keeps its two lines. -->
	<GridList
		bind:element
		scroll
		padding="xs"
		virtual={{
			estimateSize: ESTIMATED_ROW_HEIGHT,
			overscan,
			onVisibleRangeChange: handleVisibleRangeChange
		}}
		data-testid="branch-list-scroller"
		class={selected.size > 0 ? barClearanceClass : undefined}
		label="Branches"
		items={branches}
		getId={(branch: Branch) => branch.getName()}
		rowName={(branch: Branch) => branch.getName()}
		selectable={allowSelection}
		header
		value={selected}
		{disabledIds}
		onValueChange={handleSelectionChange}
		// Selecting here queues a deletion; in the restore view, a restore.
		tone={isRestoreView ? 'primary' : 'danger'}
		look="cards"
		rowBackground="surface.peak"
		passThrough={{ grid: { style: scrollPortStyle }, spacer: { style: spacerStyle } }}
		aria-busy={branchesQuery.isLoading}
		selectOver="status"
		columns={[
			// The row's status glyph, with the checkbox laid over it: it gives way
			// to the checkbox on hover / selection, and stays put on the rows that
			// can't be selected (current, locked) — the glyph says why.
			{ id: 'status', track: 'auto', srHeader: 'Status' },
			{ id: 'name', track: 'minmax(14rem, 1.2fr)', header: 'Branch' },
			{ id: 'commit', track: 'minmax(0, 1.5fr)', header: 'Last commit' },
			// Fixed widths, not `auto`: an auto track follows whichever rows
			// are mounted, so every scroll nudged the whole grid sideways. The
			// meta floor fits the longest relative date and all four hover
			// actions, which mount only for the hovered row.
			{ id: 'changes', track: '12rem', header: 'Changes' },
			{ id: 'meta', track: 'minmax(12rem, auto)', header: isRestoreView ? 'Deleted' : 'Updated' }
		]}
		narrow={{
			columns: 'auto minmax(0, 1fr) auto',
			cells: {
				status: { column: '1', row: '1' },
				name: { column: '2', row: '1' },
				changes: { column: '3', row: '1' },
				meta: { column: '3', row: '1' },
				commit: { hidden: true }
			}
		}}
	>
		{#snippet row(branch, { cell })}
			{@const commit = branch.getLastCommit()}
			{@const metrics = branch.isCurrent() ? undefined : branchMetrics.getMetrics(branch.getName())}
			{@const alerts = getBranchAlerts(branch, branch.getIsSelected() ?? false, metrics?.isMerged)}
			{@const hasAlerts = showAlerts && shouldShowBranchAlerts(alerts, branch)}
			{@const switching =
				switchBranchMutation.isPending &&
				switchBranchMutation.variables?.branch === branch.getName()}
			{@const showActions =
				switching || hoveredRow === branch.getName() || focusedRow === branch.getName()}

			<span {...cell('status', { class: statusCellClass })} data-testid="branch-status">
				<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
					{#if branch.isCurrent()}
						<Icon
							icon={LucideMapPin}
							width="14px"
							height="14px"
							data-testid="branch-status-current"
						/>
					{:else if branch.getIsLocked()}
						<Icon icon={LucideLock} width="14px" height="14px" data-testid="branch-status-locked" />
					{:else}
						<Icon icon={LucideGitBranch} width="14px" height="14px" />
					{/if}
				</Stamp>
			</span>

			<!-- Line 1: who the branch is. Line 2: what needs attention, then who
			     last touched it. -->
			<div
				{...cell('name', { class: twoLineCellClass })}
				id={getBranchElementId(branch.getName(), 'container')}
				data-testid="branch-row"
			>
				<span class={lineClass}>
					<span class={nameClass} title={branch.getName()} data-testid="branch-name">
						{branch.getName()}
					</span>
					{#if branch.isCurrent()}
						<Badge size="sm" tone="primary" data-testid="branch-current-badge">current</Badge>
					{/if}
					{#if branch.getIsLocked() && !branch.isCurrent()}
						<Badge size="sm" tone="warning" data-testid="branch-locked-badge">locked</Badge>
					{/if}
					{#if !isRestoreView}
						{#if branch.getUpstream()}
							<Tooltip content={`Tracks ${branch.getUpstream()}`}>
								{#snippet children(triggerProps)}
									<span {...triggerProps} data-testid="branch-upstream">
										<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
											<Icon icon={LucideCloud} width="14px" height="14px" />
										</Stamp>
									</span>
								{/snippet}
							</Tooltip>
						{:else}
							<Tooltip content="No remote tracking branch configured">
								{#snippet children(triggerProps)}
									<span {...triggerProps} data-testid="branch-no-upstream">
										<Stamp size="sm" emphasis="ghost" border="none" background="transparent">
											<Icon icon={LucideCloudOff} width="14px" height="14px" />
										</Stamp>
									</span>
								{/snippet}
							</Tooltip>
						{/if}
					{/if}
				</span>
				<span class={lineClass}>
					{#if hasAlerts}
						<BranchAlerts {alerts} {branch} />
					{/if}
					<span class={mutedClass} data-testid="branch-author">{commit.getAuthor()}</span>
					<span class={shaClass} title={commit.getSha()} data-testid="branch-sha">
						{commit.getShortSha()}
					</span>
				</span>
			</div>

			<span {...cell('commit')}>
				<!-- With history on, the subject previews the graph instead of
				     showing a title tooltip: two hover overlays would fight. -->
				<span
					role="presentation"
					class={subjectClass}
					title={historyEnabled ? undefined : commit.getMessage()}
					onmouseenter={(event) => hoverSubject(event.currentTarget, commit.getSha())}
					onmouseleave={leavePreview}
					data-testid="branch-commit-subject"
				>
					{commit.getMessageFirstLine()}
				</span>
			</span>

			<!-- Lines the branch adds/removes vs the current branch. -->
			<span {...cell('changes', { class: statsCellClass })}>
				{#if metrics && (metrics.linesAdded > 0 || metrics.linesRemoved > 0)}
					<span
						class={css({ display: 'flex', gap: '3xs' })}
						title={`${metrics.linesAdded} line${metrics.linesAdded === 1 ? '' : 's'} added, ${metrics.linesRemoved} line${metrics.linesRemoved === 1 ? '' : 's'} removed vs current branch`}
						data-testid="branch-diff-stats"
					>
						<Badge size="sm" emphasis="secondary" tone="success">
							+{formatLineCount(metrics.linesAdded)}
						</Badge>
						<Badge size="sm" emphasis="secondary" tone="danger">
							−{formatLineCount(metrics.linesRemoved)}
						</Badge>
					</span>
				{:else if metrics}
					<Badge
						size="sm"
						emphasis="secondary"
						title="No line changes vs current branch"
						data-testid="branch-diff-none"
					>
						±0
					</Badge>
				{:else if !branch.isCurrent() && !isRestoreView}
					<!-- Holds the slot from the first frame, so the numbers replace
					     it instead of popping in. -->
					<span
						title="Diff vs current branch not computed yet"
						data-testid="branch-diff-stats-loading"
					>
						<Badge size="sm" emphasis="secondary">±–</Badge>
					</span>
				{/if}
			</span>

			<!-- At rest: when. On hover or focus: what you can do. -->
			<span {...cell('meta', { reveal: 'rest', class: dateCellClass })}>
				{#if isRestoreView && branch.getDeletedAt()}
					<span
						title={safeFormatDate(branch.getDeletedAt()!)}
						data-testid={`deleted-at-title-${branch.getName()}`}
					>
						Deleted {safeFormatRelativeDate(branch.getDeletedAt()!)}
					</span>
				{:else}
					<span title={commit.getFormattedDate()} data-testid="branch-commit-date">
						{commit.getRelativeTime()}
					</span>
				{/if}
			</span>
			<span {...cell('meta', { reveal: 'hover', class: actionsCellClass })}>
				{#if showActions}
					{@render rowActions(branch, switching)}
				{/if}
			</span>
		{/snippet}
	</GridList>
</div>

{#snippet rowActions(branch: Branch, switching: boolean)}
	{@const commit = branch.getLastCommit()}
	{#if allowSetCurrent && !branch.isCurrent()}
		<Loading loading={switching}>
			<Tooltip content="Set as current">
				{#snippet children(triggerProps)}
					<Button
						size="sm"
						shape="square"
						emphasis="ghost"
						disabled={switchBranchMutation.isPending && !switching}
						onclick={() => handleSwitchBranch(branch.getName())}
						data-testid="switch-button"
						{...triggerProps}
					>
						<Stamp emphasis="ghost" border="none" background="transparent">
							<Icon icon={LucideMapPin} width="16px" height="16px" />
						</Stamp>
						<span class={visuallyHidden()}>Set as current</span>
					</Button>
				{/snippet}
			</Tooltip>
		</Loading>
	{/if}
	{#if allowLocking && !branch.isCurrent()}
		<LockBranchToggle {repositoryID} branch={branch.getName()} />
	{/if}
	{#if diffEnabled && !branch.isCurrent() && repositoryID}
		<Tooltip content="View branch diff">
			{#snippet children(triggerProps)}
				<Button
					size="sm"
					shape="square"
					emphasis="ghost"
					href={`${resolveRepositorySubPath(repositoryID, 'diff')}?branch=${encodeURIComponent(branch.getName())}`}
					data-testid="branch-diff-link"
					{...triggerProps}
				>
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon={LucideFileDiff} width="16px" height="16px" />
					</Stamp>
					<span class={visuallyHidden()}>View branch diff</span>
				</Button>
			{/snippet}
		</Tooltip>
	{/if}
	{#if historyEnabled && repositoryID}
		<Tooltip content="Show in history">
			{#snippet children(triggerProps)}
				<Button
					size="sm"
					shape="square"
					emphasis="ghost"
					href={`${resolveRepositorySubPath(repositoryID, 'history')}?commit=${commit.getSha()}`}
					data-testid="branch-history-link"
					{...triggerProps}
				>
					<Stamp emphasis="ghost" border="none" background="transparent">
						<Icon icon={LucideHistory} width="16px" height="16px" />
					</Stamp>
					<span class={visuallyHidden()}>Show in history</span>
				</Button>
			{/snippet}
		</Tooltip>
	{/if}
{/snippet}

{#if historyEnabled && preview && repositoryID && repositoryPath}
	<!-- Hover-only, like the card's preview was: keyboard users reach the
	     same graph through the row's history link. -->
	<Popover
		bind:open={previewOpen}
		triggerStrategy="manual"
		anchorElement={preview.anchor}
		placement="bottom-start"
		isModal={false}
		lockScroll={false}
		autoFocus={false}
	>
		<div
			role="presentation"
			onmouseenter={enterPreview}
			onmouseleave={leavePreview}
			data-testid="branch-commit-preview"
		>
			<CommitGraphPreview repoId={repositoryID} path={repositoryPath} sha={preview.sha} />
		</div>
	</Popover>
{/if}
