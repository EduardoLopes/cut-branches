<script lang="ts">
	// One commit row's slice of the branch-graph rail: lane segments, the
	// commit dot, and — for local branch heads — a pinned head marker with a
	// dashed leader line back to the gutter.
	//
	// Horizontal panning is driven entirely by the `--rail-scroll-x` CSS
	// custom property set on an ancestor by the shared scrollbar: the lane SVG
	// translates by it and the pinned head clamps against it via CSS `clamp()`,
	// so scrolling re-renders nothing. The same component renders the hover
	// preview at reduced geometry (`cell`/`size`/`railW` props).
	import { lineColorVar } from './lane-colors';
	import type {
		GraphRow,
		GraphSegment
	} from '$domains/branch-management/features/commit-history/models/commit-graph';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		row: GraphRow;
		/** Total lanes in the graph (drives the rail's inner width). */
		laneCount: number;
		/** Row height in px. */
		size?: number;
		/** Lane spacing in px. */
		cell?: number;
		/** Clipped viewport width in px. */
		railW?: number;
		/** Distance a pinned head keeps from the viewport edges. */
		pinMargin?: number;
		/** Re-center the clicked head's lane (omit to disable the affordance). */
		onCenterLane?: (lane: number) => void;
		/** When set, only the local line on this lane renders vivid; every other
		 *  local line falls back to the muted treatment. The hover preview uses
		 *  this to highlight just the hovered branch. Omit to render all local
		 *  lines vivid (the full history view). */
		highlightLane?: number;
	}

	let {
		row,
		laneCount,
		size = 48,
		cell = 24,
		railW = 260,
		pinMargin = 12,
		onCenterLane,
		highlightLane
	}: Props = $props();

	/** A line/dot is vivid when it's local AND (no highlight filter is active,
	 *  or it sits on the highlighted lane). */
	const isVivid = (colorLane: number, local: boolean): boolean =>
		local && (highlightLane === undefined || colorLane === highlightLane);

	/** Segment vividness additionally requires the segment to START in the
	 *  highlighted lane. Every segment truly on the branch's line does (tip
	 *  outgoing, pass-throughs, the tail into its fork point) — whereas a
	 *  foreign merge commit's connector INTO the branch's chain starts in the
	 *  foreign lane while carrying the branch's colorLane; without this check
	 *  it would light up like a second highlighted branch. */
	const segIsVivid = (seg: GraphSegment): boolean =>
		isVivid(seg.colorLane, seg.local) &&
		(highlightLane === undefined || seg.fromLane === highlightLane);

	const fullLaneWidth = $derived((laneCount + 1) * cell);
	const laneX = (lane: number) => lane * cell + cell / 2;
	const yPx = (y: number) => y * size;

	function segPath(fromLane: number, fromY: number, toLane: number, toY: number): string {
		const x1 = laneX(fromLane);
		const y1 = yPx(fromY);
		const x2 = laneX(toLane);
		const y2 = yPx(toY);
		if (x1 === x2) return `M ${x1} ${y1} L ${x2} ${y2}`;
		const midY = (y1 + y2) / 2;
		return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
	}

	const nodeVivid = $derived(isVivid(row.nodeColorLane, row.nodeLocal));
	const nodeColor = $derived(lineColorVar(row.nodeColorLane, nodeVivid));
	/** Head x clamped between the margins, tracking the shared rail scroll. */
	const headLeft = $derived(
		`clamp(${pinMargin}px, calc(${laneX(row.commitLane)}px - var(--rail-scroll-x, 0px)), ${railW - pinMargin}px)`
	);

	// Fixed-width rail viewport: clips lanes so they never paint over the text.
	const railViewport = css({
		flex: '0 0 auto',
		overflow: 'hidden',
		position: 'relative'
	});
	// Node "gap" color, themed — matches the surface so lines don't touch the dot.
	const nodeRingStroke = css({ stroke: 'neutral.surface.hill' });
	const headOverlay = css({
		position: 'absolute',
		inset: '0',
		pointerEvents: 'none'
	});
	const leaderLine = css({
		position: 'absolute',
		left: '0',
		borderTop: '1.5px dashed',
		opacity: '0.6'
	});
	// Comfortable hit target + press feedback for the pinned head circle.
	const headButton = css({
		position: 'absolute',
		transform: 'translate(-50%, -50%)',
		width: '40px',
		height: '40px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		background: 'transparent',
		border: 'none',
		padding: '0',
		cursor: 'pointer',
		pointerEvents: 'auto',
		_active: { scale: '0.96' }
	});
	const headRing = css({
		width: '13px',
		height: '13px',
		borderRadius: 'full',
		background: 'neutral.surface.hill',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center'
	});
	const headDot = css({
		width: '5px',
		height: '5px',
		borderRadius: 'full'
	});
</script>

<div class={railViewport} style={`width:${railW}px;`}>
	<svg
		width={fullLaneWidth}
		height={size}
		viewBox={`0 0 ${fullLaneWidth} ${size}`}
		style="overflow:visible;transform:translateX(calc(-1 * var(--rail-scroll-x, 0px)));"
	>
		{#each row.segments as seg, i (i)}
			{@const vivid = segIsVivid(seg)}
			<path
				d={segPath(seg.fromLane, seg.fromY, seg.toLane, seg.toY)}
				fill="none"
				stroke={lineColorVar(seg.colorLane, vivid)}
				stroke-width={vivid ? 2.5 : 1.75}
				stroke-linecap="round"
				opacity={vivid ? 0.95 : 0.18}
			/>
		{/each}
		{#if !row.isBranchHead}
			<!-- Ordinary commit: quiet dot (scrolls with the lanes). -->
			<circle
				class={nodeRingStroke}
				cx={laneX(row.commitLane)}
				cy={size / 2}
				r="3.5"
				fill={nodeColor}
				stroke-width="1.5"
				opacity={nodeVivid ? 0.7 : 0.4}
			/>
		{/if}
	</svg>

	{#if row.isBranchHead}
		<!-- The head marker lives in a NON-translated overlay, positioned at the
		     lane's x but clamped a margin from each edge (pure CSS, so panning
		     the rail never re-renders it). Click to re-center the lane. -->
		<div class={headOverlay}>
			<div
				class={leaderLine}
				style={`top:${size / 2}px;width:${headLeft};border-color:${nodeColor};`}
			></div>
			<button
				type="button"
				class={headButton}
				style={`left:${headLeft};top:${size / 2}px;`}
				aria-label="Center this branch"
				tabindex="-1"
				disabled={!onCenterLane}
				onclick={() => onCenterLane?.(row.commitLane)}
			>
				<span class={headRing} style={`border:3px solid ${nodeColor};`}>
					<span class={headDot} style={`background:${nodeColor};`}></span>
				</span>
			</button>
		</div>
	{/if}
</div>
