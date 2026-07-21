<script lang="ts">
	// The canvas's connection layer: one SVG holding every routed trace, painted
	// BENEATH the node panels. Every trace ends in an arrowhead at the IMPORTED
	// file — read "a → b" as "a imports b".
	//
	// Color: a SOLID trace is a Call edge, tinted from the shared graph-lane
	// palette (keyed off the imported file, so every line into the same file
	// shares a color and neighbouring lines usually differ — easier to follow a
	// line across the board). A DASHED, muted trace is an import with no detected
	// use. Hovering a node THICKENS its edges and dims the rest so the hovered
	// file's relationships stand out without recoloring. The "uses …" symbol
	// labels live in a SEPARATE layer (edge-labels.svelte) drawn ON TOP of the
	// nodes, so a panel can never cover them.
	import { type CanvasLayout } from '../models/canvas-layout';
	import {
		edgeColorLane,
		edgeLaneColor,
		mutedEdgeColor,
		EDGE_PALETTE_SIZE
	} from '../models/edge-colors';
	import { routeEdges, type RoutedEdge } from '../models/edge-routing';
	import type { StructureEdge } from '$infrastructure/bindings';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		layout: CanvasLayout;
		edges: StructureEdge[];
		/** Path of the hovered node; its edges thicken, the rest dim. */
		hoveredPath?: string | null;
	}

	let { layout, edges, hoveredPath = null }: Props = $props();

	const routed = $derived(routeEdges(layout, edges));
	// SVG paints in document order; instead of re-sorting the whole edge list
	// on every hover transition, the (few) highlighted edges render in a
	// second group after the base ones.
	const baseEdges = $derived(routed.edges.filter((edge) => !isHighlighted(edge, hoveredPath)));
	const highlightedEdges = $derived(
		routed.edges.filter((edge) => isHighlighted(edge, hoveredPath))
	);

	const lanes = Array.from({ length: EDGE_PALETTE_SIZE }, (_, lane) => lane);

	function isHighlighted(edge: { from: string; to: string }, path: string | null): boolean {
		return path !== null && (edge.from === path || edge.to === path);
	}

	/** Stroke color: lane-tinted for calls, muted for import-only edges. */
	function strokeColor(edge: RoutedEdge): string {
		return edge.kind === 'call' ? edgeLaneColor(edgeColorLane(edge.to)) : mutedEdgeColor();
	}

	/** The matching colored arrowhead marker for an edge. */
	function markerId(edge: RoutedEdge): string {
		return edge.kind === 'call' ? `edge-arrow-lane-${edgeColorLane(edge.to)}` : 'edge-arrow-muted';
	}

	const layer = css({
		position: 'absolute',
		top: '0',
		left: '0',
		pointerEvents: 'none'
	});
	const trace = css({
		fill: 'none',
		strokeWidth: '1.5',
		strokeLinejoin: 'round',
		// Import-only (no detected symbol use): dashed, so a confirmed call
		// reads as the stronger, solid relationship.
		'&[data-kind="import"]': {
			strokeDasharray: '4 3'
		},
		// While another node is hovered, unrelated edges recede.
		'&[data-dim="true"]': {
			opacity: '0.2'
		},
		'&[data-highlighted="true"]': {
			strokeWidth: '2.5'
		}
	});
</script>

<!-- Sized to the ROUTED extents — the corridor below the board and the
     outermost channels can exceed the layout's own box. -->
<svg
	class={layer}
	width={routed.width}
	height={routed.height}
	viewBox={`0 0 ${routed.width} ${routed.height}`}
	aria-hidden="true"
	data-testid="diff-canvas-edges"
>
	{#snippet trace_path(edge: RoutedEdge, highlighted: boolean)}
		<path
			class={trace}
			d={edge.path}
			style={`stroke: ${strokeColor(edge)}`}
			marker-end={`url(#${markerId(edge)})`}
			data-from={edge.from}
			data-to={edge.to}
			data-kind={edge.kind}
			data-lane={edge.kind === 'call' ? edgeColorLane(edge.to) : undefined}
			data-highlighted={highlighted ? 'true' : undefined}
			data-dim={hoveredPath !== null && !highlighted ? 'true' : undefined}
			data-testid="diff-canvas-edge"
		/>
	{/snippet}
	<defs>
		<!-- Arrowheads sit at the trace's END — the imported file. One colored
		     marker per lane (plus a muted one) so each head matches its line. -->
		{#each lanes as lane (lane)}
			<marker
				id={`edge-arrow-lane-${lane}`}
				viewBox="0 0 8 8"
				refX="7"
				refY="4"
				markerWidth="7"
				markerHeight="7"
				orient="auto"
			>
				<path style={`fill: ${edgeLaneColor(lane)}`} d="M 0 0 L 8 4 L 0 8 z" />
			</marker>
		{/each}
		<marker
			id="edge-arrow-muted"
			viewBox="0 0 8 8"
			refX="7"
			refY="4"
			markerWidth="7"
			markerHeight="7"
			orient="auto"
		>
			<path style={`fill: ${mutedEdgeColor()}`} d="M 0 0 L 8 4 L 0 8 z" />
		</marker>
	</defs>
	{#each baseEdges as edge (`${edge.from}->${edge.to}`)}
		{@render trace_path(edge, false)}
	{/each}
	{#each highlightedEdges as edge (`${edge.from}->${edge.to}`)}
		{@render trace_path(edge, true)}
	{/each}
</svg>
