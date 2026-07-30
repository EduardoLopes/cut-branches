/**
 * Shared, persisted collapsed state for the repository sidebar.
 *
 * This used to be local `$state` inside `sidebar-view`, which was right while
 * the toggle lived inside the sidebar itself. On macOS the toggle moved into
 * the window's overlay titlebar — app-shell chrome composed by the root layout,
 * not by the sidebar — so the flag now has two readers in different scopes.
 *
 * It lives in `$lib` because it is globally-shared, stateful,
 * framework-dependent logic. It stays *UI* state (§1.2): no domain owns it, and
 * nothing outside the delivery layer reads it.
 */

import { getLocalStorage } from '$utils/get-local-storage';
import { setLocalStorage } from '$utils/set-local-storage';

const STORAGE_KEY = 'sidebar-collapsed';

/**
 * Reads the persisted flag, defaulting to expanded when absent or non-boolean.
 * Exported so it is testable on its own: the module-scope read below runs once
 * per app start, which a test can't replay.
 */
export function readPersistedCollapsed(): boolean {
	return getLocalStorage<boolean>(STORAGE_KEY, false) === true;
}

let collapsed = $state<boolean>(readPersistedCollapsed());

export const sidebarCollapsed = {
	/** True while the sidebar is showing its narrow icon rail. */
	get current(): boolean {
		return collapsed;
	},
	/** Flips between the rail and the full sidebar, persisting across sessions. */
	toggle() {
		this.set(!collapsed);
	},
	/** Forces a specific state, persisting across sessions. */
	set(next: boolean) {
		collapsed = next;
		setLocalStorage(STORAGE_KEY, next);
	}
};
