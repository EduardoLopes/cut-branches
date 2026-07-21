import {
	CANVAS_MARGIN,
	COLUMN_GAP,
	type CanvasLayout,
	type CanvasNode,
	type ColumnBounds
} from './canvas-layout';
import type { StructureEdge } from '$infrastructure/bindings';

/**
 * PCB-style edge routing for the diff canvas — traces never cross a panel.
 *
 * Every trace is an orthogonal polyline whose corners are cut with 45°
 * chamfers. All horizontal and vertical runs live in the empty space the
 * layout guarantees:
 *
 * - An edge between ADJACENT columns runs through the channel between them.
 *   Each channel hands out distinct vertical LANES, so parallel runs never
 *   overlap each other.
 * - An edge spanning several columns (or a backward cycle edge) must not cut
 *   through the columns in between, so it dives instead: down the channel
 *   left of the importer, along a CORRIDOR below the whole board (one lane
 *   per edge), and back up the channel right of the imported file.
 *
 * Ports are staggered per node so a node's edges fan out instead of
 * stacking. The returned extents can exceed the layout's (the corridor sits
 * below it) — the SVG layer sizes itself to them.
 */

export interface RoutedEdge {
	from: string;
	to: string;
	/** SVG path data (`M … L …`). */
	path: string;
}

export interface RoutedEdges {
	edges: RoutedEdge[];
	/** Drawing extents — at least the layout size, larger when the corridor
	 *  or an outer channel needs room. */
	width: number;
	height: number;
}

interface Point {
	x: number;
	y: number;
}

/** Maximum chamfer size — corners get smaller cuts when segments are short. */
const CHAMFER = 16;
/** Vertical distance between the ports of a node's edges. */
const PORT_STEP = 14;
/** First port's offset from the node's top. */
const PORT_TOP = 24;
/** Clearance between the lowest node and the corridor's first lane. */
const CORRIDOR_GAP = 32;
/** Vertical distance between corridor lanes. */
const CORRIDOR_STEP = 10;
/** Channel lanes keep at least this much clearance from the columns. */
const LANE_INSET = 8;

/**
 * Turns waypoints into SVG path data, cutting every interior corner with a
 * 45° chamfer sized to fit its two segments.
 */
export function chamferedPath(points: Point[]): string {
	if (points.length === 0) {
		return '';
	}
	const parts = [`M ${points[0].x} ${points[0].y}`];
	for (let i = 1; i < points.length - 1; i++) {
		const previous = points[i - 1];
		const corner = points[i];
		const next = points[i + 1];
		const inLength = Math.hypot(corner.x - previous.x, corner.y - previous.y);
		const outLength = Math.hypot(next.x - corner.x, next.y - corner.y);
		const cut = Math.min(CHAMFER, inLength / 2, outLength / 2);
		if (cut <= 0) {
			parts.push(`L ${corner.x} ${corner.y}`);
			continue;
		}
		const inUnit = {
			x: (corner.x - previous.x) / inLength,
			y: (corner.y - previous.y) / inLength
		};
		const outUnit = { x: (next.x - corner.x) / outLength, y: (next.y - corner.y) / outLength };
		parts.push(
			`L ${corner.x - inUnit.x * cut} ${corner.y - inUnit.y * cut}`,
			`L ${corner.x + outUnit.x * cut} ${corner.y + outUnit.y * cut}`
		);
	}
	const last = points[points.length - 1];
	if (points.length > 1) {
		parts.push(`L ${last.x} ${last.y}`);
	}
	return parts.join(' ');
}

/** The y coordinate of a node's `index`-th port, kept inside the node. */
function portY(node: CanvasNode, index: number): number {
	return node.y + Math.min(PORT_TOP + index * PORT_STEP, node.height - PORT_TOP / 2);
}

/** A vertical run one edge needs inside one channel. */
interface ChannelRun {
	edgeIndex: number;
	/** 'down' runs sit left of the importer, 'up' runs right of the target. */
	role: 'entry' | 'exit';
}

/**
 * The x of lane `index` (of `count`) in channel `channel` — the gap left of
 * column `channel` (one past the last column addresses the space to its
 * right). Lanes spread evenly across the channel, inset from both columns.
 */
function laneX(columns: ColumnBounds[], channel: number, index: number, count: number): number {
	const previous = columns[channel - 1];
	const left = channel === 0 ? LANE_INSET : previous.x + previous.width + LANE_INSET;
	const right =
		channel < columns.length ? columns[channel].x - LANE_INSET : left + COLUMN_GAP - LANE_INSET * 2;
	const usable = Math.max(right - left, 0);
	return left + ((index + 1) / (count + 1)) * usable;
}

/** Routes the edges whose endpoints both exist in the layout. */
export function routeEdges(layout: CanvasLayout, edges: StructureEdge[]): RoutedEdges {
	const nodes = new Map(layout.nodes.map((node) => [node.path, node]));
	const usable = edges
		.filter((edge) => nodes.has(edge.from) && nodes.has(edge.to))
		.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

	// --- Allocation passes -----------------------------------------------------
	// Ports: nth outgoing edge of a node exits a bit lower; same for incoming.
	const outCount = new Map<string, number>();
	const inCount = new Map<string, number>();
	// Channel lanes and corridor lanes, in deterministic edge order.
	const channelRuns = new Map<number, ChannelRun[]>();
	const corridorEdges: number[] = [];

	interface Plan {
		fromNode: CanvasNode;
		toNode: CanvasNode;
		start: Point;
		end: Point;
		direct: boolean;
		entryChannel: number;
		exitChannel: number;
	}

	const claimRun = (channel: number, edgeIndex: number, role: ChannelRun['role']) => {
		const runs = channelRuns.get(channel) ?? [];
		runs.push({ edgeIndex, role });
		channelRuns.set(channel, runs);
	};

	const plans: Plan[] = usable.map((edge, edgeIndex) => {
		const fromNode = nodes.get(edge.from) as CanvasNode;
		const toNode = nodes.get(edge.to) as CanvasNode;
		const outIndex = outCount.get(edge.from) ?? 0;
		const inIndex = inCount.get(edge.to) ?? 0;
		outCount.set(edge.from, outIndex + 1);
		inCount.set(edge.to, inIndex + 1);

		const direct = fromNode.column - toNode.column === 1;
		// Runs: a direct edge crosses only the channel between its columns; a
		// corridor edge dives in the channel left of the importer and rises in
		// the channel right of the imported file.
		const entryChannel = fromNode.column;
		const exitChannel = toNode.column + 1;
		claimRun(entryChannel, edgeIndex, 'entry');
		if (!direct) {
			claimRun(exitChannel, edgeIndex, 'exit');
			corridorEdges.push(edgeIndex);
		}

		return {
			fromNode,
			toNode,
			start: { x: fromNode.x, y: portY(fromNode, outIndex) },
			end: { x: toNode.x + toNode.width, y: portY(toNode, inIndex) },
			direct,
			entryChannel,
			exitChannel
		};
	});

	// Resolve lane positions from the allocation.
	const lanePosition = new Map<string, number>();
	for (const [channel, runs] of channelRuns) {
		runs.forEach((run, index) => {
			lanePosition.set(
				`${run.edgeIndex}:${run.role}`,
				laneX(layout.columns, channel, index, runs.length)
			);
		});
	}
	const nodeBottom = layout.nodes.reduce((max, node) => Math.max(max, node.y + node.height), 0);
	const corridorY = new Map<number, number>();
	corridorEdges.forEach((edgeIndex, index) => {
		corridorY.set(edgeIndex, nodeBottom + CORRIDOR_GAP + index * CORRIDOR_STEP);
	});

	// --- Path building -----------------------------------------------------------
	let width = layout.width;
	let height = layout.height;

	const routed = plans.map((plan, edgeIndex) => {
		const { start, end } = plan;
		const entryX = lanePosition.get(`${edgeIndex}:entry`) as number;
		width = Math.max(width, entryX + CANVAS_MARGIN);

		let points: Point[];
		if (plan.direct) {
			points =
				start.y === end.y
					? [start, end]
					: [start, { x: entryX, y: start.y }, { x: entryX, y: end.y }, end];
		} else {
			const exitX = lanePosition.get(`${edgeIndex}:exit`) as number;
			const lane = corridorY.get(edgeIndex) as number;
			width = Math.max(width, exitX + CANVAS_MARGIN);
			height = Math.max(height, lane + CANVAS_MARGIN);
			points = [
				start,
				{ x: entryX, y: start.y },
				{ x: entryX, y: lane },
				{ x: exitX, y: lane },
				{ x: exitX, y: end.y },
				end
			];
		}

		return { from: usable[edgeIndex].from, to: usable[edgeIndex].to, path: chamferedPath(points) };
	});

	return { edges: routed, width, height };
}
