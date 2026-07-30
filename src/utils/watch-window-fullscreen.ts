import { getCurrentWindow } from '@tauri-apps/api/window';

/**
 * Reports whether the window is fullscreen, for chrome that has to react to the
 * OS window controls appearing and disappearing. Calls `onChange` with the
 * current value and again on every change; returns a cleanup function.
 *
 * ## Why this needs to settle rather than just listen
 *
 * The OS flag is authoritative but *late*: macOS clears it when the exit
 * animation finishes, which happens after the final resize event. So there is no
 * moment we can be notified of at which reading the flag is guaranteed correct —
 * an immediate read on resize returns the pre-transition value, and AppKit
 * exposes no "transition complete" event for Tauri to forward.
 *
 * Re-reading across a bounded ladder after each resize is therefore inherent to
 * the platform, not a shortcut: the resize tells us a transition happened, and
 * the ladder covers an animation whose duration we do not control. Window
 * geometry looks like a lag-free alternative, but a fullscreen viewport does not
 * reliably equal the screen size (notched displays inset their content), so it
 * misreports fullscreen as windowed.
 *
 * The reads are cheap and happen only after a resize, never on an idle window.
 *
 * Global, framework-agnostic utility (§2).
 */

/** Covers a transition of unknown duration without polling indefinitely. */
const SETTLE_DELAYS = [0, 100, 300, 600, 1000, 1600];

export function watchWindowFullscreen(onChange: (fullscreen: boolean) => void): () => void {
	let appWindow: ReturnType<typeof getCurrentWindow>;

	try {
		appWindow = getCurrentWindow();
	} catch {
		// No Tauri host (unit tests, `pnpm dev:svelte`): report windowed once and
		// stay put, so callers don't need their own fallback.
		onChange(false);
		return () => {};
	}

	let disposed = false;
	let last: boolean | undefined;
	let timers: ReturnType<typeof setTimeout>[] = [];

	async function read() {
		try {
			const next = await appWindow.isFullscreen();
			// Only surface real changes, so a settle ladder that reads the same value
			// six times still notifies once.
			if (!disposed && next !== last) {
				last = next;
				onChange(next);
			}
		} catch {
			// Window went away mid-query; nothing useful to do.
		}
	}

	function clearTimers() {
		timers.forEach(clearTimeout);
		timers = [];
	}

	function onResize() {
		clearTimers();
		timers = SETTLE_DELAYS.map((delay) => setTimeout(() => void read(), delay));
	}

	void read();
	window.addEventListener('resize', onResize);

	return () => {
		disposed = true;
		clearTimers();
		window.removeEventListener('resize', onResize);
	};
}
