import { vi, afterEach } from 'vitest';

// Vitest 5 browser mode assigns Vite `define` entries onto `globalThis` as the
// raw config strings (`'"7a083b0"'`, `'""'`), clobbering the values Vite already
// evaluated for the client. SvelteKit's `base` and our About-page metadata then
// come out double-quoted. Decode any JSON-looking `__CONST__` global back to its
// value; entries that aren't JSON (e.g. `globalThis.__sveltekit_dev`) are left
// alone. Harmless once upstream fixes it: parsed values are no longer strings.
for (const key of Object.keys(globalThis)) {
	const value = globalThis[key];
	if (!/^__[A-Z0-9_]+__$/.test(key) || typeof value !== 'string') continue;
	try {
		globalThis[key] = JSON.parse(value);
	} catch {
		// Not a JSON literal — a raw code reference; leave it as is.
	}
}

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
