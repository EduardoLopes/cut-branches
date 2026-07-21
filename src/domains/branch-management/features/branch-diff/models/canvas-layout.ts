import type { StructureEdge } from '$infrastructure/bindings';

/**
 * Pure auto-layout for the diff canvas.
 *
 * Files connected by import edges form a left-to-right DAG: a file sits one
 * column to the RIGHT of everything it imports, so dependencies read
 * left-to-right (leaf dependencies first, dependents flowing rightward).
 * Cycles are broken deterministically (see below) for layout only — the
 * edges themselves still render. Within a column, nodes are ordered by the
 * barycenter of their dependencies (the average y of the nodes they import),
 * which keeps connected nodes near each other and reduces edge crossings.
 * Files with no edges land in a plain grid below the DAG, sorted by path.
 *
 * Node sizes are COMPUTED (fixed width, height from the symbol count), not
 * measured — the model stays pure, and the canvas never needs a layout pass
 * to position anything. The row-height constants here are a CONTRACT with
 * file-node.svelte, which pins its rows to the same pixel heights so nothing
 * clips.
 */

/** What the layout needs to know about one changed file. */
export interface CanvasFile {
	path: string;
	/** How many changed-symbol rows the node will show (capped for height). */
	symbolCount: number;
	/** Whether the node embeds its diff — expanded nodes get a wider slot
	 *  and a fixed-height diff area (which scrolls internally). */
	expanded?: boolean;
}

export interface CanvasNode {
	path: string;
	x: number;
	y: number;
	width: number;
	height: number;
	/** DAG column (0 = leftmost). Isolated grid nodes report their grid
	 *  column; they never participate in edge routing. */
	column: number;
}

/** Horizontal span of one DAG column — the routing channels sit between. */
export interface ColumnBounds {
	x: number;
	width: number;
}

export interface CanvasLayout {
	nodes: CanvasNode[];
	/** DAG column spans, left to right (empty when nothing is connected). */
	columns: ColumnBounds[];
	/** Total content size, margins included — the pannable area. */
	width: number;
	height: number;
}

export const NODE_WIDTH = 280;
/** Width of a node showing its embedded diff. */
export const EXPANDED_NODE_WIDTH = 640;
/** Fixed height of the embedded diff area — the diff scrolls inside it. */
export const DIFF_AREA_HEIGHT = 360;
/** Node inner padding (top + bottom each) — mirrored by file-node.svelte. */
export const NODE_PADDING = 12;
/** Height of the status/path row and of the stats row. */
export const NODE_ROW_HEIGHT = 26;
/** Height of one changed-symbol line (and of the "+n more" line). */
export const SYMBOL_ROW_HEIGHT = 20;
/** Symbols shown before the node truncates with "+n more". */
export const NODE_SYMBOL_LIMIT = 5;
/** Horizontal space between DAG columns — the edge routing channel. */
export const COLUMN_GAP = 120;
export const CANVAS_MARGIN = 24;
const ROW_GAP = 24;
const GRID_GAP = 24;
/** Columns of the isolated-files grid section. */
const GRID_COLUMNS = 3;

export function nodeHeight(symbolCount: number, expanded = false): number {
	const rows = Math.min(symbolCount, NODE_SYMBOL_LIMIT);
	const more = symbolCount > NODE_SYMBOL_LIMIT ? 1 : 0;
	const base = NODE_PADDING * 2 + NODE_ROW_HEIGHT * 2 + (rows + more) * SYMBOL_ROW_HEIGHT;
	return expanded ? base + DIFF_AREA_HEIGHT : base;
}

export function nodeWidth(expanded = false): number {
	return expanded ? EXPANDED_NODE_WIDTH : NODE_WIDTH;
}

/**
 * The DAG column of every connected file: `column(file) = 1 + max(column of
 * its imports)`, i.e. longest path from a leaf dependency. Cycles are broken
 * by ignoring the dependency edge that closes a cycle, visiting files in
 * sorted-path order so the result is deterministic.
 */
function assignColumns(paths: string[], importsOf: Map<string, string[]>): Map<string, number> {
	const columns = new Map<string, number>();
	const visiting = new Set<string>();

	function columnOf(path: string): number {
		const known = columns.get(path);
		if (known !== undefined) {
			return known;
		}
		if (visiting.has(path)) {
			// Back-edge of a cycle: ignore it for layout.
			return -1;
		}
		visiting.add(path);
		let column = 0;
		for (const dep of importsOf.get(path) ?? []) {
			column = Math.max(column, columnOf(dep) + 1);
		}
		visiting.delete(path);
		columns.set(path, column);
		return column;
	}

	for (const path of [...paths].sort()) {
		columnOf(path);
	}
	return columns;
}

/** Lays out the changed files. Deterministic for a given input. */
export function buildCanvasLayout(files: CanvasFile[], edges: StructureEdge[]): CanvasLayout {
	const byPath = new Map(files.map((file) => [file.path, file]));
	// Only edges between files actually on the canvas count (search filtering
	// can hide one endpoint).
	const usable = edges.filter((edge) => byPath.has(edge.from) && byPath.has(edge.to));

	const importsOf = new Map<string, string[]>();
	const connectedPaths = new Set<string>();
	for (const edge of usable) {
		connectedPaths.add(edge.from);
		connectedPaths.add(edge.to);
		const deps = importsOf.get(edge.from) ?? [];
		deps.push(edge.to);
		importsOf.set(edge.from, deps);
	}
	for (const deps of importsOf.values()) {
		deps.sort();
	}

	const nodes: CanvasNode[] = [];
	const columnBounds: ColumnBounds[] = [];
	let width = 0;
	let height = 0;

	// --- DAG section: connected files in dependency columns -------------------
	const columns = assignColumns([...connectedPaths], importsOf);
	const byColumn = new Map<number, string[]>();
	for (const path of [...connectedPaths].sort()) {
		// Every connected path received a column in assignColumns.
		const column = columns.get(path) as number;
		const list = byColumn.get(column) ?? [];
		list.push(path);
		byColumn.set(column, list);
	}

	// Placed nodes' vertical centers — the input to the next column's
	// barycenter ordering.
	const centers = new Map<string, number>();

	// Columns place left to right, each as wide as its widest node —
	// expanded nodes widen their whole column instead of overlapping the
	// next one.
	let columnLeft = CANVAS_MARGIN;
	for (const [column, paths] of [...byColumn.entries()].sort(([a], [b]) => a - b)) {
		// Barycenter: order by the average center of the already-placed
		// dependencies, falling back to the end (then path order) when a node
		// has none placed yet.
		const barycenter = (path: string): number => {
			const placed = (importsOf.get(path) ?? [])
				.map((dep) => centers.get(dep))
				.filter((center): center is number => center !== undefined);
			if (placed.length === 0) {
				return Number.MAX_SAFE_INTEGER;
			}
			return placed.reduce((sum, center) => sum + center, 0) / placed.length;
		};
		// Decorate-sort-undecorate: one barycenter evaluation per node, not
		// two per comparison (this runs on every keystroke/toggle).
		const barycenters = new Map(paths.map((path) => [path, barycenter(path)]));
		const ordered = [...paths].sort(
			(a, b) =>
				(barycenters.get(a) as number) - (barycenters.get(b) as number) || a.localeCompare(b)
		);

		const x = columnLeft;
		let columnWidth = NODE_WIDTH;
		let y = CANVAS_MARGIN;
		for (const path of ordered) {
			// Connected paths come from edges filtered against the file set, so
			// the lookup always hits.
			const file = byPath.get(path) as CanvasFile;
			const node = {
				path,
				x,
				y,
				width: nodeWidth(file.expanded),
				height: nodeHeight(file.symbolCount, file.expanded),
				column
			};
			nodes.push(node);
			centers.set(path, node.y + node.height / 2);
			y = node.y + node.height + ROW_GAP;
			height = Math.max(height, node.y + node.height);
			columnWidth = Math.max(columnWidth, node.width);
		}
		columnBounds.push({ x, width: columnWidth });
		width = Math.max(width, x + columnWidth);
		columnLeft = x + columnWidth + COLUMN_GAP;
	}

	// --- Grid section: isolated files below the DAG ---------------------------
	const isolated = files
		.filter((file) => !connectedPaths.has(file.path))
		.sort((a, b) => a.path.localeCompare(b.path));

	if (isolated.length > 0) {
		const gridTop = height > 0 ? height + ROW_GAP * 2 : CANVAS_MARGIN;
		const columnBottoms = Array.from({ length: GRID_COLUMNS }, () => gridTop);
		// One slot width for the whole grid: its widest node.
		const slotWidth = isolated.reduce((max, file) => Math.max(max, nodeWidth(file.expanded)), 0);
		isolated.forEach((file, index) => {
			const column = index % GRID_COLUMNS;
			const node = {
				path: file.path,
				x: CANVAS_MARGIN + column * (slotWidth + GRID_GAP),
				y: columnBottoms[column],
				width: nodeWidth(file.expanded),
				height: nodeHeight(file.symbolCount, file.expanded),
				column
			};
			nodes.push(node);
			columnBottoms[column] = node.y + node.height + GRID_GAP;
			height = Math.max(height, node.y + node.height);
			width = Math.max(width, node.x + node.width);
		});
	}

	return {
		nodes,
		columns: columnBounds,
		width: width + CANVAS_MARGIN,
		height: height + CANVAS_MARGIN
	};
}
