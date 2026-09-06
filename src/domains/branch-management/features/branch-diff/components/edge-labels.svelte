<script lang="ts">
	// The "uses …" symbol labels for Call edges, drawn ON TOP of the node panels
	// (the trace layer sits beneath them). Each label is an opaque rounded chip
	// listing the used symbols one per line, so a long list grows downward into
	// a narrow chip instead of a wide banner that would overlap the panels. Only
	// the hovered node's Call edges show a label, so the board isn't buried.
	import { type CanvasLayout } from '../models/canvas-layout';
	import { edgeLabelLines, edgeLabelWidth, EDGE_LABEL_HEADER } from '../models/edge-label';
	import { routeEdges } from '../models/edge-routing';
	import type { StructureEdge } from '$infrastructure/bindings';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		layout: CanvasLayout;
		edges: StructureEdge[];
		/** Path of the hovered node; only its Call edges label. */
		hoveredPath?: string | null;
	}

	let { layout, edges, hoveredPath = null }: Props = $props();

	/** Height of one line inside a chip. */
	const LINE_HEIGHT = 15;
	/** Vertical padding inside a chip (top + bottom each). */
	const CHIP_PAD_Y = 6;

	const routed = $derived(routeEdges(layout, edges));
	const labelled = $derived(
		routed.edges
			.filter(
				(edge) =>
					edge.kind === 'call' &&
					edge.symbols.length > 0 &&
					hoveredPath !== null &&
					(edge.from === hoveredPath || edge.to === hoveredPath)
			)
			.map((edge) => {
				const lines = edgeLabelLines(edge.symbols);
				return {
					from: edge.from,
					to: edge.to,
					lines,
					width: edgeLabelWidth(edge.symbols),
					height: lines.length * LINE_HEIGHT + CHIP_PAD_Y * 2,
					x: edge.labelPoint.x,
					y: edge.labelPoint.y
				};
			})
	);

	/** The y of line `index` so the whole block is centered on the anchor. */
	function lineY(centerY: number, count: number, index: number): number {
		return centerY - ((count - 1) / 2) * LINE_HEIGHT + index * LINE_HEIGHT;
	}

	const layer = css({
		position: 'absolute',
		top: '0',
		left: '0',
		pointerEvents: 'none'
	});
	const chip = css({
		fill: 'token(colors.neutral.surface.base)',
		stroke: 'token(colors.neutral.border)',
		strokeWidth: '1'
	});
	const header = css({
		fill: 'token(colors.neutral.text.muted)',
		fontSize: '9px',
		fontFamily: 'mono',
		textTransform: 'uppercase',
		dominantBaseline: 'middle',
		textAnchor: 'middle'
	});
	const name = css({
		fill: 'token(colors.neutral.text)',
		fontSize: '11px',
		fontFamily: 'mono',
		dominantBaseline: 'middle',
		textAnchor: 'middle'
	});
</script>

<svg
	class={layer}
	width={routed.width}
	height={routed.height}
	viewBox={`0 0 ${routed.width} ${routed.height}`}
	aria-hidden="true"
	data-testid="diff-canvas-edge-labels"
>
	{#each labelled as item (`${item.from}->${item.to}`)}
		<g data-from={item.from} data-to={item.to} data-testid="diff-canvas-edge-label">
			<rect
				class={chip}
				x={item.x - item.width / 2}
				y={item.y - item.height / 2}
				width={item.width}
				height={item.height}
				rx="5"
			/>
			{#each item.lines as line, index (index)}
				<text
					class={line === EDGE_LABEL_HEADER && index === 0 ? header : name}
					x={item.x}
					y={lineY(item.y, item.lines.length, index)}
				>
					{line}
				</text>
			{/each}
		</g>
	{/each}
</svg>
