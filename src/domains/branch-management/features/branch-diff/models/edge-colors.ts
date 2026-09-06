/**
 * Themed colors for the canvas edges, reusing the global commit-graph lane
 * palette (`colors.graph.*`, defined in panda.config.ts) so the diff canvas and
 * the history graph rail speak the same visual language. Call edges are colored
 * by a stable hash of their TARGET file, so every line into the same file shares
 * a color and adjacent unrelated lines usually differ — the same readability
 * trick the branch graph uses. Import-only edges stay muted.
 *
 * The lane index is a pure function (safe in the layout model); the token
 * lookups are render-side (CSS variables that follow theme changes for free).
 */

import { token, type Token } from '@pindoba/styled-system/tokens';

/** Distinct edge colors available (matches the graph lane palette). */
export const EDGE_PALETTE_SIZE = 8;

/** A stable palette lane (0..7) for an edge, keyed off any string. */
export function edgeColorLane(key: string): number {
	let hash = 0;
	for (let index = 0; index < key.length; index++) {
		hash = (hash * 31 + key.charCodeAt(index)) | 0;
	}
	return ((hash % EDGE_PALETTE_SIZE) + EDGE_PALETTE_SIZE) % EDGE_PALETTE_SIZE;
}

/** Themed stroke color for a given lane. */
export function edgeLaneColor(lane: number): string {
	const index = ((lane % EDGE_PALETTE_SIZE) + EDGE_PALETTE_SIZE) % EDGE_PALETTE_SIZE;
	return token.var(`colors.graph.lane.${index}` as Token);
}

/** Themed stroke color for import-only (no detected use) edges. */
export function mutedEdgeColor(): string {
	return token.var('colors.graph.muted');
}
