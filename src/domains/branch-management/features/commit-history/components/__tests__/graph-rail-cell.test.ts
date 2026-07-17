import { describe, expect, it, vi } from 'vitest';
import GraphRailCell from '../graph-rail-cell.svelte';
import { laneColorVar, mutedLaneVar } from '../lane-colors';
import {
	computeGraph,
	type HistoryCommit,
	type RefDecoration
} from '$domains/branch-management/features/commit-history/models/commit-graph';
import { renderWithTestWrapper } from '$utils/test-utils';

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

const graph = computeGraph([
	mk('head', ['mid'], [{ name: 'main', kind: 'localBranch' }]),
	mk('mid', ['root']),
	mk('root', [])
]);

describe('GraphRailCell', () => {
	it('renders the row segments with themed lane colors', () => {
		const { container } = renderWithTestWrapper(GraphRailCell, {
			row: graph.rows[1],
			laneCount: graph.laneCount
		});

		const paths = container.querySelectorAll('path');
		expect(paths.length).toBe(graph.rows[1].segments.length);
		expect(paths[0].getAttribute('stroke')).toBe(laneColorVar(0));
	});

	it('renders a quiet dot for an ordinary commit and no head overlay', () => {
		const { container } = renderWithTestWrapper(GraphRailCell, {
			row: graph.rows[1],
			laneCount: graph.laneCount
		});

		expect(container.querySelector('circle')).not.toBeNull();
		expect(container.querySelector('button')).toBeNull();
	});

	it('renders the pinned head marker with a clamped position for a branch head', async () => {
		const onCenterLane = vi.fn();
		const { container, getByRole } = renderWithTestWrapper(GraphRailCell, {
			row: graph.rows[0],
			laneCount: graph.laneCount,
			onCenterLane
		});

		expect(container.querySelector('circle')).toBeNull(); // no plain dot
		const head = getByRole('button', { name: 'Center this branch' });
		await expect.element(head).toBeInTheDocument();
		const style = container.querySelector('button')?.getAttribute('style') ?? '';
		expect(style).toContain('clamp(12px,');
		expect(style).toContain('var(--rail-scroll-x, 0px)');

		await head.click();
		expect(onCenterLane).toHaveBeenCalledWith(graph.rows[0].commitLane);
	});

	it('disables the head affordance when no centering callback is given', async () => {
		const { getByRole } = renderWithTestWrapper(GraphRailCell, {
			row: graph.rows[0],
			laneCount: graph.laneCount
		});

		await expect.element(getByRole('button', { name: 'Center this branch' })).toBeDisabled();
	});

	it('scales down for the preview geometry', () => {
		const { container } = renderWithTestWrapper(GraphRailCell, {
			row: graph.rows[1],
			laneCount: graph.laneCount,
			size: 20,
			cell: 12,
			railW: 100
		});

		const svg = container.querySelector('svg');
		expect(svg?.getAttribute('width')).toBe(String((graph.laneCount + 1) * 12));
		expect(svg?.getAttribute('height')).toBe('20');
	});

	it('uses the muted token for non-local segments', () => {
		const nonLocal = computeGraph([mk('t1', ['t0'], [{ name: 'v1', kind: 'tag' }]), mk('t0', [])]);
		const { container } = renderWithTestWrapper(GraphRailCell, {
			row: nonLocal.rows[0],
			laneCount: nonLocal.laneCount
		});

		expect(container.querySelector('path')?.getAttribute('stroke')).toBe(mutedLaneVar());
	});

	describe('highlightLane', () => {
		// Two local branches off the same root: `main` in lane 0, `feat` in
		// lane 1. The `feat` row draws main's pass-through (colorLane 0) and its
		// own outgoing line (colorLane 1).
		const twoBranches = computeGraph([
			mk('a', ['root'], [{ name: 'main', kind: 'localBranch' }]),
			mk('b', ['root'], [{ name: 'feat', kind: 'localBranch' }]),
			mk('root', [])
		]);
		const featRow = twoBranches.rows[1];

		it('keeps only the highlighted lane vivid, muting other local lines', () => {
			const { container } = renderWithTestWrapper(GraphRailCell, {
				row: featRow,
				laneCount: twoBranches.laneCount,
				highlightLane: 1
			});

			const [passThrough, outgoing] = [...container.querySelectorAll('path')];
			expect(passThrough.getAttribute('stroke')).toBe(mutedLaneVar());
			expect(passThrough.getAttribute('opacity')).toBe('0.18');
			expect(outgoing.getAttribute('stroke')).toBe(laneColorVar(1));
			expect(outgoing.getAttribute('opacity')).toBe('0.95');
		});

		it('mutes a branch head sitting off the highlighted lane', () => {
			const { container } = renderWithTestWrapper(GraphRailCell, {
				row: featRow,
				laneCount: twoBranches.laneCount,
				highlightLane: 0
			});

			const ring = container.querySelector('button span');
			expect(ring?.getAttribute('style')).toContain(mutedLaneVar());
		});

		it('mutes a foreign merge connector into the highlighted lane', () => {
			// `feat` (hovered, lane 0) with `main`'s merge commit in lane 1 whose
			// second parent is on feat's chain. The merge connector curves from
			// lane 1 into lane 0 and carries colorLane 0 — it must NOT light up
			// as if it were part of the hovered branch.
			const merged = computeGraph([
				mk('t', ['p'], [{ name: 'feat', kind: 'localBranch' }]),
				mk('m', ['x', 'p'], [{ name: 'main', kind: 'localBranch' }]),
				mk('p', ['root']),
				mk('x', ['root']),
				mk('root', [])
			]);
			const mergeRow = merged.rows[1];

			const { container } = renderWithTestWrapper(GraphRailCell, {
				row: mergeRow,
				laneCount: merged.laneCount,
				highlightLane: 0
			});

			const paths = [...container.querySelectorAll('path')];
			const strokes = mergeRow.segments.map((seg, i) => ({ seg, stroke: paths[i] }));

			// feat's own pass-through (lane 0 → lane 0) stays vivid…
			const passThrough = strokes.find((s) => s.seg.fromLane === 0 && s.seg.toLane === 0);
			expect(passThrough?.stroke.getAttribute('stroke')).toBe(laneColorVar(0));
			expect(passThrough?.stroke.getAttribute('opacity')).toBe('0.95');

			// …but the merge connector (lane 1 → lane 0, colorLane 0) mutes.
			const connector = strokes.find((s) => s.seg.fromLane === 1 && s.seg.toLane === 0);
			expect(connector?.stroke.getAttribute('stroke')).toBe(mutedLaneVar());
			expect(connector?.stroke.getAttribute('opacity')).toBe('0.18');
		});

		it('mutes an ordinary local dot off the highlighted lane', () => {
			// Row `mid` from the shared graph: an ordinary commit on main's local
			// line in lane 0, viewed while lane 1 is highlighted.
			const { container } = renderWithTestWrapper(GraphRailCell, {
				row: graph.rows[1],
				laneCount: graph.laneCount,
				highlightLane: 1
			});

			const dot = container.querySelector('circle');
			expect(dot?.getAttribute('fill')).toBe(mutedLaneVar());
			expect(dot?.getAttribute('opacity')).toBe('0.4');
		});
	});
});
