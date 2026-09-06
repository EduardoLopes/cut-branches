// Render-side mapping from the pure graph model's lane indices to themed
// colors. The palette lives as Panda semantic tokens (panda.config.ts →
// colors.graph.*), so SVG strokes receive CSS variables and follow theme
// changes without any re-render.

import { token, type Token } from '@pindoba/styled-system/tokens';

/** How many distinct lane colors the palette defines. */
export const LANE_PALETTE_SIZE = 8;

/** Themed color for a lane's vivid (local-branch) line. */
export const laneColorVar = (lane: number): string =>
	token.var(
		// The palette index is always 0..7, so the path is a valid token.
		`colors.graph.lane.${((lane % LANE_PALETTE_SIZE) + LANE_PALETTE_SIZE) % LANE_PALETTE_SIZE}` as Token
	);

/** Themed color for muted (non-local) lines. */
export const mutedLaneVar = (): string => token.var('colors.graph.muted');

/** Color for a line, given the model's `colorLane` + `local` pair. */
export const lineColorVar = (colorLane: number, local: boolean): string =>
	local ? laneColorVar(colorLane) : mutedLaneVar();
