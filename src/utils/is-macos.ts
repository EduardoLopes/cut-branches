/**
 * Whether the app is running on macOS.
 *
 * Drives platform-conditional window chrome: on macOS the window uses an
 * overlay titlebar, so the app draws its own strip alongside the traffic
 * lights; every other platform keeps its standard decorations.
 *
 * `@tauri-apps/plugin-os`'s `platform()` is a bare read of an internals global
 * the plugin injects at webview startup, so it throws outside a Tauri host —
 * in unit tests and in `pnpm dev:svelte`. Read that global defensively and fall
 * back to the user agent, which WKWebView reports as `Macintosh` anyway.
 *
 * Global, stateless utility (§2).
 */

interface OsPluginInternals {
	platform?: string;
}

export function isMacOS(): boolean {
	const injected = (globalThis as { __TAURI_OS_PLUGIN_INTERNALS__?: OsPluginInternals })
		.__TAURI_OS_PLUGIN_INTERNALS__;

	if (typeof injected?.platform === 'string') {
		return injected.platform === 'macos';
	}

	return /Mac|iPhone|iPad/.test(globalThis.navigator?.userAgent ?? '');
}
