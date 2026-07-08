import { beforeEach, describe, expect, it } from 'vitest';
import { cleanupSummary } from '../cleanup-summary.svelte';

beforeEach(() => {
	cleanupSummary.clear();
});

describe('cleanupSummary', () => {
	it('is undefined until a scan records a value', () => {
		expect(cleanupSummary.reclaimableBytes).toBeUndefined();
	});

	it('records and exposes the latest reclaimable bytes', () => {
		cleanupSummary.set(1024);
		expect(cleanupSummary.reclaimableBytes).toBe(1024);

		cleanupSummary.set(2048);
		expect(cleanupSummary.reclaimableBytes).toBe(2048);
	});

	it('clears back to undefined', () => {
		cleanupSummary.set(512);
		cleanupSummary.clear();
		expect(cleanupSummary.reclaimableBytes).toBeUndefined();
	});
});
