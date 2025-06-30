import '@testing-library/jest-dom/vitest';
import * as matchers from '@testing-library/jest-dom/matchers';
import { vi, expect, afterEach } from 'vitest';

expect.extend(matchers);

Object.defineProperty(window, 'matchMedia', {
	writable: true,
	value: (query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {}, // deprecated
		removeListener: () => {}, // deprecated
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {}
	})
});

window.IntersectionObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn()
}));

HTMLDialogElement.prototype.show = vi.fn();
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

// Mock Tauri API - can be overridden in individual tests
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn()
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn().mockResolvedValue('/test/path')
}));

afterEach(() => {
	vi.clearAllTimers();
});
