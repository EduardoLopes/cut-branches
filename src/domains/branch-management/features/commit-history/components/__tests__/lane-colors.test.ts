import { describe, expect, it } from 'vitest';
import { LANE_PALETTE_SIZE, laneColorVar, lineColorVar, mutedLaneVar } from '../lane-colors';

describe('lane-colors', () => {
	it('maps lanes onto the palette tokens cyclically', () => {
		expect(laneColorVar(0)).toBe('var(--colors-graph-lane-0)');
		expect(laneColorVar(7)).toBe('var(--colors-graph-lane-7)');
		expect(laneColorVar(8)).toBe('var(--colors-graph-lane-0)');
		expect(laneColorVar(LANE_PALETTE_SIZE + 3)).toBe(laneColorVar(3));
	});

	it('never produces a negative palette index', () => {
		expect(laneColorVar(-1)).toBe('var(--colors-graph-lane-7)');
	});

	it('uses the muted token for non-local lines', () => {
		expect(mutedLaneVar()).toBe('var(--colors-graph-muted)');
		expect(lineColorVar(2, false)).toBe(mutedLaneVar());
		expect(lineColorVar(2, true)).toBe(laneColorVar(2));
	});
});
