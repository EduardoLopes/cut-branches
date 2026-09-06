import { describe, expect, it } from 'vitest';
import {
	buildDisplay,
	computeGraph,
	createGraphBuilder,
	findDisplayIndex,
	isLocalBranchHead,
	type DisplayItem,
	type HistoryCommit,
	type RefDecoration
} from '../commit-graph';

const mk = (sha: string, parents: string[], refs: RefDecoration[] = []): HistoryCommit => ({
	sha,
	shortSha: sha.slice(0, 7),
	parents,
	refs,
	author: 'Test User',
	email: 'test@example.com',
	date: 'Mon Jan  1 00:00:00 2024 +0000',
	message: `commit ${sha}`
});

const local = (name: string): RefDecoration => ({ name, kind: 'localBranch' });
const remote = (name: string): RefDecoration => ({ name, kind: 'remoteBranch' });
const tag = (name: string): RefDecoration => ({ name, kind: 'tag' });

describe('isLocalBranchHead', () => {
	it('is true only when a local branch ref points at the commit', () => {
		expect(isLocalBranchHead(mk('a', [], [local('main')]))).toBe(true);
		expect(isLocalBranchHead(mk('a', [], [remote('origin/main'), tag('v1')]))).toBe(false);
		expect(isLocalBranchHead(mk('a', []))).toBe(false);
	});
});

describe('computeGraph', () => {
	it('lays a linear chain out in a single lane', () => {
		const graph = computeGraph([mk('c3', ['c2'], [local('main')]), mk('c2', ['c1']), mk('c1', [])]);

		expect(graph.laneCount).toBe(1);
		expect(graph.rows.map((r) => r.commitLane)).toEqual([0, 0, 0]);
		expect(graph.rows[0].isTip).toBe(true);
		expect(graph.rows[0].isBranchHead).toBe(true);
		expect(graph.rows[1].isTip).toBe(false);
		// The whole chain continues main's local line.
		expect(graph.rows.map((r) => r.nodeLocal)).toEqual([true, true, true]);
		// Root closes its lane: single incoming segment, no outgoing.
		const root = graph.rows[2];
		expect(root.segments).toEqual([
			{ fromLane: 0, fromY: 0, toLane: 0, toY: 0.5, colorLane: 0, local: true }
		]);
	});

	it('opens a lane for a second branch and closes it at the merge base', () => {
		// main: m2 -> b ; feature: f1 -> b
		const graph = computeGraph([
			mk('m2', ['b'], [local('main')]),
			mk('f1', ['b'], [local('feature')]),
			mk('b', ['r']),
			mk('r', [])
		]);

		expect(graph.laneCount).toBe(2);
		const [m2, f1, b] = graph.rows;
		expect(m2.commitLane).toBe(0);
		expect(f1.commitLane).toBe(1);
		// Both lanes converge into b (two incoming segments).
		expect(b.commitLane).toBe(0);
		const incoming = b.segments.filter((s) => s.toY === 0.5);
		expect(incoming).toHaveLength(2);
		expect(incoming.map((s) => s.fromLane).sort()).toEqual([0, 1]);
	});

	it('draws a merge commit with outgoing segments to both parents', () => {
		// M merges feature (f1) into main (m1).
		const graph = computeGraph([
			mk('M', ['m1', 'f1'], [local('main')]),
			mk('f1', ['b'], [local('feature')]),
			mk('m1', ['b']),
			mk('b', [])
		]);

		const merge = graph.rows[0];
		const outgoing = merge.segments.filter((s) => s.fromY === 0.5);
		expect(outgoing).toHaveLength(2);
		// First parent continues the merge's own lane, keeping its local colour.
		expect(outgoing[0].toLane).toBe(merge.commitLane);
		expect(outgoing[0].local).toBe(true);
		// Second parent opens another lane; nothing local is known to live
		// there yet, so the connector stays muted.
		expect(outgoing[1].toLane).not.toBe(merge.commitLane);
		expect(outgoing[1].local).toBe(false);
	});

	it('keeps a merged-in non-local side branch muted end to end', () => {
		// M merges f2 -> f1 into main; the side branch has no local ref (already
		// deleted or remote-only), so it is not deletable and never highlighted.
		const graph = computeGraph([
			mk('M', ['m1', 'f2'], [local('main')]),
			mk('f2', ['f1']),
			mk('m1', ['b']),
			mk('f1', ['b']),
			mk('b', [])
		]);

		const [M, f2, m1, f1, b] = graph.rows;
		// The merge connector into the side lane is muted.
		const sideConnector = M.segments.filter((s) => s.fromY === 0.5)[1];
		expect(sideConnector.local).toBe(false);
		// The side commits' nodes and lines stay muted.
		expect(f2.nodeLocal).toBe(false);
		expect(f1.nodeLocal).toBe(false);
		const pass = m1.segments.find((s) => s.fromY === 0 && s.toY === 1);
		expect(pass!.local).toBe(false);
		// At the fork, the side line's rejoin is muted; main's own line is not.
		const rejoin = b.segments.filter((s) => s.toY === 0.5);
		expect(rejoin.map((s) => s.local).sort()).toEqual([false, true]);
		// A non-local side line does not anchor a fork point either.
		expect(b.isForkPoint).toBe(false);
	});

	it('colours the merge connector when the merged lane carries a local branch line', () => {
		// f2 (local feature tip) is waiting for f1; M merges f1, reusing that
		// lane — the connector joins a deletable branch's line, so it is vivid.
		const graph = computeGraph([
			mk('f2', ['f1'], [local('feature')]),
			mk('M', ['m1', 'f1'], [local('main')]),
			mk('f1', ['b']),
			mk('m1', ['b']),
			mk('b', [])
		]);

		const sideConnector = graph.rows[1].segments.filter((s) => s.fromY === 0.5)[1];
		expect(sideConnector.local).toBe(true);
	});

	it('leaves a lane muted when only a non-local merge touches it', () => {
		// A remote-only merge must not colour the lanes it opens.
		const graph = computeGraph([
			mk('M', ['m1', 'f1'], [remote('origin/main')]),
			mk('f1', []),
			mk('m1', [])
		]);

		expect(graph.rows[0].segments.every((s) => !s.local)).toBe(true);
		expect(graph.rows[1].nodeLocal).toBe(false);
	});

	it('reuses the lane already waiting for a merge parent', () => {
		// f2 (feature tip) is already waiting for f1 in its lane; when M places
		// its second parent f1, that lane must be reused, not a new one opened.
		const graph = computeGraph([
			mk('f2', ['f1'], [local('feature')]),
			mk('M', ['m1', 'f1'], [local('main')]),
			mk('f1', ['b']),
			mk('m1', ['b']),
			mk('b', [])
		]);

		const merge = graph.rows[1];
		const second = merge.segments.filter((s) => s.fromY === 0.5)[1];
		expect(second.toLane).toBe(graph.rows[0].commitLane);
		expect(graph.laneCount).toBe(2);
	});

	it('handles an octopus merge (three parents)', () => {
		const graph = computeGraph([
			mk('M', ['p1', 'p2', 'p3'], [local('main')]),
			mk('p1', []),
			mk('p2', []),
			mk('p3', [])
		]);

		const outgoing = graph.rows[0].segments.filter((s) => s.fromY === 0.5);
		expect(outgoing).toHaveLength(3);
		expect(new Set(outgoing.map((s) => s.toLane)).size).toBe(3);
		expect(graph.laneCount).toBe(3);
	});

	it('draws pass-through lanes straight down and keeps them muted when non-local', () => {
		// While walking m2 (between feature tip f2 and its parent), feature's
		// lane passes through m2's row.
		const graph = computeGraph([
			mk('f2', ['f1'], [remote('origin/feature')]),
			mk('m2', ['m1'], [local('main')]),
			mk('f1', []),
			mk('m1', [])
		]);

		const m2 = graph.rows[1];
		const pass = m2.segments.find((s) => s.fromY === 0 && s.toY === 1);
		expect(pass).toBeDefined();
		expect(pass!.fromLane).toBe(pass!.toLane);
		// origin/feature is not a local branch: its line stays muted.
		expect(pass!.local).toBe(false);

		// And the local main line reports its lanes for the collapsed bundle.
		expect(m2.localLanes).toContain(m2.commitLane);
	});

	it('keeps a non-local line grey but colours the node row of a local head', () => {
		const graph = computeGraph([mk('t1', ['c1'], [tag('v1')]), mk('c1', [])]);

		expect(graph.rows[0].isBranchHead).toBe(false);
		expect(graph.rows[0].nodeLocal).toBe(false);
		expect(graph.rows[0].segments.every((s) => !s.local)).toBe(true);
	});

	it('reuses a freed lane for the next tip', () => {
		// root1 closes lane 0; tip2's walk starts after, reusing lane 0.
		const graph = computeGraph([mk('root1', [], [local('a')]), mk('tip2', [], [local('b')])]);

		expect(graph.rows[0].commitLane).toBe(0);
		expect(graph.rows[1].commitLane).toBe(0);
		expect(graph.laneCount).toBe(1);
	});

	it('marks a lane local when a local child continues into it', () => {
		// head -> mid -> root: mid/root have no refs but sit on main's line.
		const graph = computeGraph([
			mk('head', ['mid'], [local('main')]),
			mk('mid', ['root']),
			mk('root', [])
		]);

		expect(graph.rows[1].nodeLocal).toBe(true);
		expect(graph.rows[2].nodeLocal).toBe(true);
	});

	it('marks the commit a local branch forked from as a fork point', () => {
		const graph = computeGraph([
			mk('m0', ['m1'], [local('main')]),
			mk('m1', ['b']),
			mk('f0', ['b'], [local('feature')]),
			mk('b', ['r']),
			mk('r', [])
		]);

		const shaOf = (sha: string) => graph.rows.find((r) => r.commit.sha === sha)!;
		expect(shaOf('b').isForkPoint).toBe(true);
		// Plain line commits and the heads themselves are not fork points.
		expect(shaOf('m1').isForkPoint).toBe(false);
		expect(shaOf('m0').isForkPoint).toBe(false);
		expect(shaOf('f0').isForkPoint).toBe(false);
	});

	it('does not mark a fork point for a remote-only branch', () => {
		const graph = computeGraph([
			mk('m0', ['m1'], [local('main')]),
			mk('m1', ['b']),
			mk('f0', ['b'], [remote('origin/feature')]),
			mk('b', ['r']),
			mk('r', [])
		]);

		expect(graph.rows.find((r) => r.commit.sha === 'b')!.isForkPoint).toBe(false);
	});

	it('returns an empty graph for no commits', () => {
		expect(computeGraph([])).toEqual({ rows: [], laneCount: 0 });
	});
});

describe('createGraphBuilder (incremental append)', () => {
	// Deterministic PRNG so the property test is reproducible.
	const mulberry32 = (seed: number) => () => {
		seed |= 0;
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};

	/** Random DAG in newest-first topological order: parents are always
	 *  created earlier (older), so reverse creation order keeps children
	 *  before parents. */
	const randomCommits = (rand: () => number, size: number): HistoryCommit[] => {
		const commits: HistoryCommit[] = [];
		for (let i = 0; i < size; i++) {
			const parentCount = i === 0 ? 0 : rand() < 0.2 ? 2 : 1;
			const parents: string[] = [];
			while (parents.length < Math.min(parentCount, i)) {
				const p = `c${Math.floor(rand() * i)}`;
				if (!parents.includes(p)) parents.push(p);
			}
			const refs: RefDecoration[] =
				rand() < 0.3 ? [local(`branch-${i}`)] : rand() < 0.15 ? [remote(`origin/b${i}`)] : [];
			commits.push(mk(`c${i}`, parents, refs));
		}
		return commits.reverse();
	};

	it('appending in chunks is equivalent to one full layout, for any chunking', () => {
		const rand = mulberry32(0xc0ffee);
		for (let round = 0; round < 12; round++) {
			const commits = randomCommits(rand, 40 + Math.floor(rand() * 60));
			const full = computeGraph(commits);

			const builder = createGraphBuilder();
			const rows = [];
			let i = 0;
			while (i < commits.length) {
				const chunk = 1 + Math.floor(rand() * 15);
				rows.push(...builder.append(commits.slice(i, i + chunk)));
				i += chunk;
			}

			expect(rows).toEqual(full.rows);
			expect(builder.laneCount).toBe(full.laneCount);
			expect(builder.rowCount).toBe(full.rows.length);
		}
	});

	it('exposes running laneCount and rowCount across appends', () => {
		const builder = createGraphBuilder();
		expect(builder.laneCount).toBe(0);
		expect(builder.rowCount).toBe(0);

		builder.append([mk('m2', ['m1'], [local('main')]), mk('f1', ['m1'], [local('f')])]);
		expect(builder.rowCount).toBe(2);
		expect(builder.laneCount).toBe(2);

		builder.append([mk('m1', [])]);
		expect(builder.rowCount).toBe(3);
		expect(builder.laneCount).toBe(2);
	});
});

describe('buildDisplay', () => {
	// head(H) then a run of plain commits — the shape the collapse acts on.
	const rows = (spec: string) =>
		computeGraph(
			[...spec].map((ch, i, all) =>
				mk(`c${i}`, i === all.length - 1 ? [] : [`c${i + 1}`], ch === 'H' ? [local(`b${i}`)] : [])
			)
		).rows;

	it('folds maximal runs of collapseMin+ non-head commits into the host row above', () => {
		const items = buildDisplay(rows('H..H...'), new Set(), 2);
		expect(items.map((i) => i.t)).toEqual(['commit', 'commit']);

		const host1 = items[0] as Extract<DisplayItem, { t: 'commit' }>;
		expect(host1.runBelow).toEqual({ groupId: 'c1', count: 2, collapsed: true });
		// The host stands in for the hidden commits in paging.
		expect(host1.lastCommitIndex).toBe(2);

		const host2 = items[1] as Extract<DisplayItem, { t: 'commit' }>;
		expect(host2.runBelow).toEqual({ groupId: 'c4', count: 3, collapsed: true });
		expect(host2.lastCommitIndex).toBe(6);
	});

	it('keeps runs shorter than collapseMin expanded without a run marker', () => {
		const items = buildDisplay(rows('H.H'), new Set(), 2);
		expect(items.map((i) => i.t)).toEqual(['commit', 'commit', 'commit']);
		expect(items.every((i) => i.t === 'commit' && !i.runBelow)).toBe(true);
	});

	it('expands an open run in place, keeping the host row marker', () => {
		const items = buildDisplay(rows('H..'), new Set(['c1']), 2);
		expect(items.map((i) => i.t)).toEqual(['commit', 'commit', 'commit']);
		const host = items[0] as Extract<DisplayItem, { t: 'commit' }>;
		expect(host.runBelow).toEqual({ groupId: 'c1', count: 2, collapsed: false });
		// The host's own index is untouched; indices flow through the rows.
		expect(items.map((i) => i.lastCommitIndex)).toEqual([0, 1, 2]);
	});

	it('falls back to a standalone row for a run at the very start (no host above)', () => {
		const items = buildDisplay(rows('..H'), new Set(), 2);
		expect(items.map((i) => i.t)).toEqual(['collapsed', 'commit']);
		const run = items[0] as Extract<DisplayItem, { t: 'collapsed' }>;
		expect(run.groupId).toBe('c0');
		expect(run.count).toBe(2);
	});

	it('gives an expanded start-of-list run a header row so it can fold back', () => {
		const items = buildDisplay(rows('..H'), new Set(['c0']), 2);
		expect(items.map((i) => i.t)).toEqual(['header', 'commit', 'commit', 'commit']);
		const header = items[0] as Extract<DisplayItem, { t: 'header' }>;
		expect(header.groupId).toBe('c0');
		expect(header.count).toBe(2);
	});

	it('keeps a local branch fork point visible, folding only the commits in between', () => {
		// m0(H) -> m1 -> m2 -> b ; f0(H) -> b ; b -> r1 -> r2. The fork commit b
		// must stay visible: the runs fold above and below it, never across it.
		const graphRows = computeGraph([
			mk('m0', ['m1'], [local('main')]),
			mk('m1', ['m2']),
			mk('m2', ['b']),
			mk('f0', ['b'], [local('feature')]),
			mk('b', ['r1']),
			mk('r1', ['r2']),
			mk('r2', [])
		]).rows;

		const items = buildDisplay(graphRows, new Set(), 2);
		expect(items.map((i) => i.t)).toEqual(['commit', 'commit', 'commit']);
		const [m0, f0, b] = items as Extract<DisplayItem, { t: 'commit' }>[];
		expect(m0.runBelow).toEqual({ groupId: 'm1', count: 2, collapsed: true });
		expect(f0.row.commit.sha).toBe('f0');
		// The fork point hosts its own run instead of vanishing into f0's.
		expect(b.row.commit.sha).toBe('b');
		expect(b.row.isForkPoint).toBe(true);
		expect(b.runBelow).toEqual({ groupId: 'r1', count: 2, collapsed: true });
	});

	it('respects a custom collapseMin', () => {
		expect(buildDisplay(rows('H..'), new Set(), 3).map((i) => i.t)).toEqual([
			'commit',
			'commit',
			'commit'
		]);
	});

	it('returns nothing for no rows', () => {
		expect(buildDisplay([], new Set())).toEqual([]);
	});
});

describe('findDisplayIndex', () => {
	const graphRows = computeGraph([
		mk('c0', ['c1'], [local('main')]),
		mk('c1', ['c2']),
		mk('c2', ['c3']),
		mk('c3', ['c4'], [local('feature')]),
		mk('c4', [])
	]).rows;

	it('finds a visible commit row', () => {
		const items = buildDisplay(graphRows, new Set(), 2);
		// H(hosts c1..c2), H, commit(c4)
		expect(findDisplayIndex(items, 0)).toEqual({ t: 'visible', displayIndex: 0 });
		expect(findDisplayIndex(items, 3)).toEqual({ t: 'visible', displayIndex: 1 });
		expect(findDisplayIndex(items, 4)).toEqual({ t: 'visible', displayIndex: 2 });
	});

	it('reports the host row of a collapsed run with its group id', () => {
		const items = buildDisplay(graphRows, new Set(), 2);
		expect(findDisplayIndex(items, 1)).toEqual({
			t: 'collapsed',
			displayIndex: 0,
			groupId: 'c1'
		});
		expect(findDisplayIndex(items, 2)).toEqual({
			t: 'collapsed',
			displayIndex: 0,
			groupId: 'c1'
		});
	});

	it('reports a standalone collapsed run at the start of the list', () => {
		const startRunRows = computeGraph([
			mk('c0', ['c1']),
			mk('c1', ['c2']),
			mk('c2', [], [local('main')])
		]).rows;
		const items = buildDisplay(startRunRows, new Set(), 2);
		// collapsed(c0..c1), H
		expect(findDisplayIndex(items, 1)).toEqual({
			t: 'collapsed',
			displayIndex: 0,
			groupId: 'c0'
		});
	});

	it('finds commits inside an expanded run', () => {
		const items = buildDisplay(graphRows, new Set(['c1']), 2);
		// H(marker), commit(c1), commit(c2), H, commit(c4)
		expect(findDisplayIndex(items, 2)).toEqual({ t: 'visible', displayIndex: 2 });
	});

	it('returns null for a commit beyond the folded rows', () => {
		const items = buildDisplay(graphRows, new Set(), 2);
		expect(findDisplayIndex(items, 99)).toBeNull();
	});
});
