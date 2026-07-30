import { describe, it, expect, afterEach, vi } from 'vitest';
import { isMacOS } from '../is-macos';

type WithInternals = { __TAURI_OS_PLUGIN_INTERNALS__?: { platform?: string } };

function setInjectedPlatform(platform: unknown) {
	(globalThis as WithInternals).__TAURI_OS_PLUGIN_INTERNALS__ = platform as { platform?: string };
}

afterEach(() => {
	delete (globalThis as WithInternals).__TAURI_OS_PLUGIN_INTERNALS__;
	vi.unstubAllGlobals();
});

describe('isMacOS', () => {
	it('reads the platform injected by the Tauri os plugin', () => {
		setInjectedPlatform({ platform: 'macos' });

		expect(isMacOS()).toBe(true);
	});

	it('is false for a non-macOS injected platform', () => {
		setInjectedPlatform({ platform: 'windows' });

		expect(isMacOS()).toBe(false);
	});

	it('prefers the injected platform over the user agent', () => {
		setInjectedPlatform({ platform: 'windows' });
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)' });

		expect(isMacOS()).toBe(false);
	});

	it('falls back to the user agent when the plugin global is absent', () => {
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' });

		expect(isMacOS()).toBe(true);
	});

	it('falls back to the user agent when the injected platform is not a string', () => {
		setInjectedPlatform({ platform: 42 });
		vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });

		expect(isMacOS()).toBe(false);
	});

	it('is false when there is no platform signal at all', () => {
		vi.stubGlobal('navigator', undefined);

		expect(isMacOS()).toBe(false);
	});
});
