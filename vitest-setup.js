import { vi, afterEach } from 'vitest';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// Mock Tauri API - can be overridden in individual tests
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
	Channel: vi.fn().mockImplementation(function () {
		this.onmessage = null;
		return this;
	})
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/test/path')
}));

afterEach(() => {
	vi.clearAllTimers();
});
