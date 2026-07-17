// Commit-graph layout model for the history view.
//
// Assigns each commit to a lane and produces per-row draw instructions for
// the SVG graph rail. This is the standard "active lanes" walk used by
// git-graph tools: first-parent stays in lane, extra parents and merges
// open/close lanes. There is no crossing minimisation.
//
// The model is pure and theme-free: segments carry a `colorLane` index and a
// `local` flag; mapping those to actual colors happens render-side
// (components/commit-history/lane-colors.ts) so the palette can be themed.
//
// Layout is resumable: `createGraphBuilder()` retains the active-lanes state
// between calls, so each page of commits is laid out exactly once — appending
// a page is O(page), not O(everything loaded).

export type RefKind = 'localBranch' | 'remoteBranch' | 'tag';

export interface RefDecoration {
	name: string;
	kind: RefKind;
}

/** A commit in the walk, with the topology the graph needs. Structurally
 *  identical to the wire `HistoryCommit` from the bindings; the query adapter
 *  is the boundary that asserts that. */
export interface HistoryCommit {
	sha: string;
	shortSha: string;
	/** Parent SHAs, first-parent first. Empty for the root; >1 for merges. */
	parents: string[];
	/** Branch/tag/remote names pointing at this commit, local branches first. */
	refs: RefDecoration[];
	author: string;
	email: string;
	date: string;
	message: string;
}

/** A local-branch head is the deletion candidate — the thing to emphasise. */
export const isLocalBranchHead = (commit: HistoryCommit): boolean =>
	commit.refs.some((r) => r.kind === 'localBranch');

/** A line to draw inside one row's cell. `y` is 0=top, 0.5=node row, 1=bottom. */
export interface GraphSegment {
	fromLane: number;
	fromY: number;
	toLane: number;
	toY: number;
	/** Lane whose palette entry colors this line (when `local`). */
	colorLane: number;
	/** Whether this line belongs to a local branch (vivid) or not (muted). */
	local: boolean;
}

export interface GraphRow {
	commit: HistoryCommit;
	commitLane: number;
	isTip: boolean;
	/** True when a local branch points here — the row to emphasise for deletion. */
	isBranchHead: boolean;
	/** True when a local branch's line merges into this commit from a side
	 *  lane — the fork point that local branch started from. */
	isForkPoint: boolean;
	/** Palette lane for the node dot (paired with `nodeLocal`). */
	nodeColorLane: number;
	nodeLocal: boolean;
	segments: GraphSegment[];
	/** Lanes carrying a local-branch line at this row. */
	localLanes: number[];
}

export interface Graph {
	rows: GraphRow[];
	laneCount: number;
}

// --- Incremental layout ----------------------------------------------------

export interface GraphBuilder {
	/** Lays out the next (older) page of commits, assumed to continue the
	 *  newest-first topological order. Returns rows for ONLY these commits. */
	append(commits: HistoryCommit[]): GraphRow[];
	/** Running maximum across everything appended so far. */
	readonly laneCount: number;
	/** Total rows laid out so far. */
	readonly rowCount: number;
}

const firstFree = (lanes: (string | null)[]): number => {
	const i = lanes.indexOf(null);
	return i === -1 ? lanes.length : i;
};

/**
 * Creates a resumable lane-layout walk. The loop-carried state (which sha
 * each lane is waiting to place next, and whether it carries a local line)
 * persists between `append` calls, so pages can be laid out incrementally.
 */
export function createGraphBuilder(): GraphBuilder {
	// Each lane holds the sha it is currently "waiting" to place next, or null.
	let lanes: (string | null)[] = [];
	// Parallel to `lanes`: whether that lane is carrying a local-branch line.
	let laneLocal: boolean[] = [];
	let laneCount = 0;
	let rowCount = 0;

	const append = (commits: HistoryCommit[]): GraphRow[] => {
		const rows: GraphRow[] = [];

		for (const commit of commits) {
			const before = lanes.slice();
			const beforeLocal = laneLocal.slice();

			// Lane this commit occupies: a lane already waiting for it, else a new one.
			let commitLane = before.indexOf(commit.sha);
			const isTip = commitLane === -1;
			if (isTip) commitLane = firstFree(before);

			const head = isLocalBranchHead(commit);
			// This commit sits on a local line if it's a local head, or a local child
			// continued into this lane via its first parent.
			const onLocalLine = head || beforeLocal[commitLane] === true;

			// Fork point: a LOCAL branch's line merges into this commit from a side
			// lane — the commit that branch grew out of. A remote/tag line forking
			// off doesn't count: only deletable local branches get an anchor.
			let isForkPoint = false;
			for (let j = 0; j < before.length; j++) {
				if (before[j] === commit.sha && j !== commitLane && beforeLocal[j] === true) {
					isForkPoint = true;
					break;
				}
			}

			// Lanes going into the next row start as a copy; lanes waiting for THIS
			// commit collapse into commitLane (merges), then we place its parents.
			const after = before.slice();
			const afterLocal = beforeLocal.slice();
			for (let j = 0; j < after.length; j++) {
				if (after[j] === commit.sha) {
					after[j] = null;
					afterLocal[j] = false;
				}
			}

			const parentLanes: number[] = [];
			commit.parents.forEach((parent, k) => {
				let lane: number;
				if (k === 0) {
					lane = commitLane; // first parent continues this lane
					afterLocal[lane] = onLocalLine;
				} else {
					const existing = after.indexOf(parent);
					lane = existing !== -1 ? existing : firstFree(after);
				}
				after[lane] = parent;
				parentLanes.push(lane);
			});
			if (commit.parents.length === 0) {
				after[commitLane] = null; // root commit
				afterLocal[commitLane] = false;
			}

			const segments: GraphSegment[] = [];
			const localLanes = new Set<number>();
			const addSeg = (
				fromLane: number,
				fromY: number,
				toLane: number,
				toY: number,
				colorLane: number,
				local: boolean
			) => {
				segments.push({ fromLane, fromY, toLane, toY, colorLane, local });
				if (local) {
					localLanes.add(fromLane);
					localLanes.add(toLane);
				}
			};

			// Incoming: every lane that was waiting for this commit draws into the
			// node. Coloured only when the child line itself is local — a merged or
			// remote side line stays muted all the way into the node it forks from.
			for (let j = 0; j < before.length; j++) {
				if (before[j] === commit.sha) {
					addSeg(j, 0, commitLane, 0.5, j, beforeLocal[j] === true);
				}
			}

			// Pass-through: unrelated lanes carrying another sha straight down.
			// (Placements never overwrite a lane holding an unrelated sha, so
			// every such lane survives into `after` unchanged.)
			for (let j = 0; j < before.length; j++) {
				const sha = before[j];
				if (sha == null || sha === commit.sha) continue;
				addSeg(j, 0, j, 1, j, beforeLocal[j] === true);
			}

			// Outgoing: node down to each parent's lane. Coloured only when the
			// target lane carries a local line (the first-parent continuation of a
			// local line, or a merge of another local branch's line) — merging a
			// non-local branch draws a muted connector, so only deletable local
			// branches are ever highlighted.
			parentLanes.forEach((pl) => {
				addSeg(commitLane, 0.5, pl, 1, pl, afterLocal[pl] === true);
			});

			lanes = after;
			laneLocal = afterLocal;
			laneCount = Math.max(laneCount, before.length, after.length, commitLane + 1);
			rows.push({
				commit,
				commitLane,
				isTip,
				isBranchHead: head,
				isForkPoint,
				nodeColorLane: commitLane,
				nodeLocal: onLocalLine,
				segments,
				localLanes: [...localLanes]
			});
		}

		rowCount += rows.length;
		return rows;
	};

	return {
		append,
		get laneCount() {
			return laneCount;
		},
		get rowCount() {
			return rowCount;
		}
	};
}

/**
 * Convenience full-recompute layout (tests, the hover preview's small
 * window). Equivalent to a single `append` of everything.
 */
export function computeGraph(commits: HistoryCommit[]): Graph {
	const builder = createGraphBuilder();
	const rows = builder.append(commits);
	return { rows, laneCount: builder.laneCount };
}

// --- Collapse model -------------------------------------------------------
// Runs of consecutive non-head commits fold away so branch tips sit close
// together. A run hangs off the commit row ABOVE it (`runBelow`) — the toggle
// renders in that row's gutter, so a collapsed run costs no vertical space.
// Only a run with no row above it (start of the list) falls back to its own
// standalone `collapsed`/`header` row.

/** A foldable run of commits hanging below a commit row. */
export type RunBelow = { groupId: string; count: number; collapsed: boolean };

/** A rendered row: a real commit (possibly hosting a run below it), or the
 *  standalone collapsed/header row of a run with no host commit above it. */
export type DisplayItem =
	| { t: 'commit'; row: GraphRow; lastCommitIndex: number; runBelow?: RunBelow }
	| { t: 'collapsed'; groupId: string; count: number; lastCommitIndex: number }
	| { t: 'header'; groupId: string; count: number; lastCommitIndex: number };

/**
 * Fold the graph rows into display items. Maximal runs of `collapseMin`+
 * consecutive plain commits collapse unless their group id (the run's newest
 * sha) is in `open`. Branch heads AND local fork points stay visible — a run
 * only folds the commits in between, never the commit a local branch started
 * from. Shorter runs stay expanded so the graph doesn't jump for one or two
 * commits.
 */
export function buildDisplay(rows: GraphRow[], open: Set<string>, collapseMin = 2): DisplayItem[] {
	const items: DisplayItem[] = [];
	let run: GraphRow[] = [];
	let runStart = 0;

	const flush = () => {
		if (run.length === 0) return;
		const groupId = run[0].commit.sha;
		const lastCommitIndex = runStart + run.length - 1;
		const foldable = run.length >= collapseMin;
		const collapsed = foldable && !open.has(groupId);
		const prev = items.at(-1);
		const host = prev?.t === 'commit' ? prev : undefined;

		if (foldable && host) {
			host.runBelow = { groupId, count: run.length, collapsed };
		}
		if (collapsed) {
			if (host) {
				// The host row stands in for the hidden commits: extending its
				// lastCommitIndex keeps infinite-scroll paging monotonic.
				host.lastCommitIndex = lastCommitIndex;
			} else {
				items.push({ t: 'collapsed', groupId, count: run.length, lastCommitIndex });
			}
		} else {
			if (foldable && !host) {
				items.push({ t: 'header', groupId, count: run.length, lastCommitIndex });
			}
			run.forEach((r, k) => items.push({ t: 'commit', row: r, lastCommitIndex: runStart + k }));
		}
		run = [];
	};

	rows.forEach((r, i) => {
		if (r.isBranchHead || r.isForkPoint) {
			flush();
			items.push({ t: 'commit', row: r, lastCommitIndex: i });
		} else {
			if (run.length === 0) runStart = i;
			run.push(r);
		}
	});
	flush();
	return items;
}

/** Where a commit (by absolute row index) sits in the display list. */
export type DisplayLocation =
	| { t: 'visible'; displayIndex: number }
	| { t: 'collapsed'; displayIndex: number; groupId: string };

/**
 * Locates the display item containing the commit at `commitIndex`. Returns a
 * `collapsed` location (with the run's group id, so the caller can expand it)
 * when the commit is hidden inside a collapsed run; `null` when the commit is
 * beyond the rows folded into `items`.
 */
export function findDisplayIndex(
	items: DisplayItem[],
	commitIndex: number
): DisplayLocation | null {
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item.t === 'commit') {
			// A host row's lastCommitIndex covers its collapsed run; the row's
			// own commit index sits just before the hidden range.
			const hidden = item.runBelow?.collapsed ? item.runBelow.count : 0;
			const ownIndex = item.lastCommitIndex - hidden;
			if (ownIndex === commitIndex) return { t: 'visible', displayIndex: i };
			if (hidden > 0 && commitIndex > ownIndex && commitIndex <= item.lastCommitIndex) {
				return { t: 'collapsed', displayIndex: i, groupId: item.runBelow!.groupId };
			}
		} else if (item.t === 'collapsed') {
			const first = item.lastCommitIndex - item.count + 1;
			if (commitIndex >= first && commitIndex <= item.lastCommitIndex) {
				return { t: 'collapsed', displayIndex: i, groupId: item.groupId };
			}
		}
	}
	return null;
}
