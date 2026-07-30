import { describe, it, expect, vi, afterEach } from 'vitest';
import { foldText } from '../fold-text';

function mockReducedMotion(matches: boolean) {
	vi.spyOn(window, 'matchMedia').mockReturnValue({
		matches
	} as MediaQueryList);
}

describe('foldText', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('interpolates opacity and max-width from hidden to fully shown', () => {
		mockReducedMotion(false);
		const config = foldText(document.createElement('h2'));

		expect(config.duration).toBe(200);
		expect(config.delay).toBe(0);
		expect(config.css?.(0, 1)).toBe('opacity: 0; max-width: calc(0 * 100%); filter: blur(4px)');
		expect(config.css?.(1, 0)).toBe('opacity: 1; max-width: calc(1 * 100%); filter: blur(0px)');
	});

	it('honors custom duration and delay', () => {
		mockReducedMotion(false);
		const config = foldText(document.createElement('h2'), { duration: 250, delay: 120 });

		expect(config.duration).toBe(250);
		expect(config.delay).toBe(120);
	});

	it('collapses to zero duration and delay under prefers-reduced-motion', () => {
		mockReducedMotion(true);
		const config = foldText(document.createElement('h2'), { duration: 250, delay: 120 });

		expect(config.duration).toBe(0);
		expect(config.delay).toBe(0);
	});
});
