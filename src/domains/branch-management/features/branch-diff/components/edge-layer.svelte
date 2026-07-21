<script lang="ts">
	// The canvas's connection layer: one SVG holding every routed import
	// trace. Every trace ends in an arrowhead at the IMPORTED file — read
	// "a → b" as "a imports b". Hovering a node lifts its edges with the
	// primary color; the highlighted paths render last so they paint on top.
	import { type CanvasLayout } from '../models/canvas-layout';
	import { routeEdges } from '../models/edge-routing';
	import type { StructureEdge } from '$infrastructure/bindings';
	import { css } from '@pindoba/styled-system/css';

	interface Props {
		layout: CanvasLayout;
		edges: StructureEdge[];
		/** Path of the hovered node; its edges highlight. */
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

	function isHighlighted(edge: { from: string; to: string }, path: string | null): boolean {
		return path !== null && (edge.from === path || edge.to === path);
	}

	const layer = css({
		position: 'absolute',
		top: '0',
		left: '0',
		pointerEvents: 'none'
	});
	const trace = css({
		fill: 'none',
		stroke: 'token(colors.neutral.border)',
		strokeWidth: '1.5',
		strokeLinejoin: 'round',
		'&[data-highlighted="true"]': {
			stroke: 'token(colors.primary.border)',
			strokeWidth: '2'
		}
	});
	const arrowFill = css({ fill: 'token(colors.neutral.border)' });
	const arrowFillHighlighted = css({ fill: 'token(colors.primary.border)' });
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
	{#snippet trace_path(edge: { from: string; to: string; path: string }, highlighted: boolean)}
		<path
			class={trace}
			d={edge.path}
			marker-end={highlighted ? 'url(#edge-arrow-highlighted)' : 'url(#edge-arrow)'}
			data-from={edge.from}
			data-to={edge.to}
			data-highlighted={highlighted ? 'true' : undefined}
			data-testid="diff-canvas-edge"
		/>
	{/snippet}
	<defs>
		<!-- Arrowheads sit at the trace's END — the imported file. `orient`
		     follows the final segment, which always runs horizontally into
		     the target's right edge. -->
		<marker
			id="edge-arrow"
			viewBox="0 0 8 8"
			refX="7"
			refY="4"
			markerWidth="7"
			markerHeight="7"
			orient="auto"
		>
			<path class={arrowFill} d="M 0 0 L 8 4 L 0 8 z" />
		</marker>
		<marker
			id="edge-arrow-highlighted"
			viewBox="0 0 8 8"
			refX="7"
			refY="4"
			markerWidth="7"
			markerHeight="7"
			orient="auto"
		>
			<path class={arrowFillHighlighted} d="M 0 0 L 8 4 L 0 8 z" />
		</marker>
	</defs>
	{#each baseEdges as edge (`${edge.from}->${edge.to}`)}
		{@render trace_path(edge, false)}
	{/each}
	{#each highlightedEdges as edge (`${edge.from}->${edge.to}`)}
		{@render trace_path(edge, true)}
	{/each}
</svg>
