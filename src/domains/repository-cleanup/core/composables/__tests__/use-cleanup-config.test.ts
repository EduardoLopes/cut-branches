import { beforeEach, describe, expect, it } from 'vitest';
import {
	getCleanupConfig,
	resetCleanupConfig,
	setCleanupConfig
} from '../use-cleanup-config.svelte';

beforeEach(() => {
	localStorage.clear();
	resetCleanupConfig();
});

describe('use-cleanup-config', () => {
	it('provides sensible defaults', () => {
		const config = getCleanupConfig();
		expect(config.thresholdDays).toBe(90);
		expect(config.defaultDeletionMode).toBe('trash');
	});

	it('has no allowlist or gitignore fields', () => {
		const config = getCleanupConfig() as Record<string, unknown>;
		expect(config.allowlist).toBeUndefined();
		expect(config.includeGitignore).toBeUndefined();
	});

	it('applies a partial update without dropping other fields', () => {
		setCleanupConfig({ thresholdDays: 30 });
		expect(getCleanupConfig().thresholdDays).toBe(30);
		expect(getCleanupConfig().defaultDeletionMode).toBe('trash');

		setCleanupConfig({ defaultDeletionMode: 'permanent' });
		expect(getCleanupConfig().defaultDeletionMode).toBe('permanent');
		expect(getCleanupConfig().thresholdDays).toBe(30);
	});

	it('resets every setting to its default', () => {
		setCleanupConfig({ thresholdDays: 5, defaultDeletionMode: 'permanent' });
		resetCleanupConfig();
		expect(getCleanupConfig().thresholdDays).toBe(90);
		expect(getCleanupConfig().defaultDeletionMode).toBe('trash');
	});
});
