import { flushSync } from 'svelte';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { useRestorationProgress } from '../use-restoration-progress.svelte';
import { withEffectRoot } from '$utils/with-effect-root.svelte';

const mockUnlisten = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/event', () => ({
	listen: (event: string, handler: (...args: unknown[]) => void) =>
		mockListen(event, handler).then(() => mockUnlisten)
}));

beforeEach(() => {
	mockUnlisten.mockClear();
	mockListen.mockClear();
	mockListen.mockResolvedValue(undefined);
});

describe('useRestorationProgress', () => {
	test('starts at zero', () => {
		const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
		expect(p.total).toBe(0);
		expect(p.processed).toBe(0);
		expect(p.percent).toBe(0);
		expect(p.estimatedTimeRemaining).toBeNull();
		cleanup();
	});

	test('start() seeds total and resets counters', () => {
		const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
		p.start(5);
		expect(p.total).toBe(5);
		expect(p.processed).toBe(0);
		expect(p.percent).toBe(0);
		expect(p.estimatedTimeRemaining).toBe('Calculating...');
		cleanup();
	});

	test('tick() increments processed and percent', () => {
		const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
		p.start(4);
		p.tick();
		p.tick();
		expect(p.processed).toBe(2);
		expect(p.percent).toBe(50);
		cleanup();
	});

	test('tick() is a no-op before start()', () => {
		const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
		p.tick();
		expect(p.processed).toBe(0);
		expect(p.percent).toBe(0);
		cleanup();
	});

	test('estimatedTimeRemaining transitions through formats', () => {
		vi.useFakeTimers();
		try {
			const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
			p.start(10);
			vi.advanceTimersByTime(500);
			p.tick();
			expect(p.estimatedTimeRemaining).toMatch(/seconds$/);

			vi.advanceTimersByTime(5 * 60_000);
			p.tick();
			expect(p.estimatedTimeRemaining).toMatch(/minutes$/);
			cleanup();
		} finally {
			vi.useRealTimers();
		}
	});

	test('reset() clears state', () => {
		const { value: p, cleanup } = withEffectRoot(() => useRestorationProgress());
		p.start(3);
		p.tick();
		p.reset();
		expect(p.total).toBe(0);
		expect(p.processed).toBe(0);
		expect(p.percent).toBe(0);
		expect(p.estimatedTimeRemaining).toBeNull();
		cleanup();
	});

	test('subscribes to branch-restored event on mount', () => {
		const { cleanup } = withEffectRoot(() => useRestorationProgress());
		flushSync();
		expect(mockListen).toHaveBeenCalledWith('branch-restored', expect.any(Function));
		cleanup();
	});
});
