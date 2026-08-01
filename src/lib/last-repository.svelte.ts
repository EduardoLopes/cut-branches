/**
 * The repository the user last had open, remembered across sessions.
 *
 * This is a cross-domain seam (§1.5): the repository route records the id it is
 * showing, and onboarding's startup redirect reads it to reopen that repository
 * — without either side importing the other. It lives in `$lib` because it is
 * globally-shared, stateful, framework-dependent logic, and it stays *UI* state
 * (§1.2): no domain owns it, and nothing outside the delivery layer reads it.
 *
 * Only the repository is remembered, not the sub-route: relaunching always lands
 * on the branches page, even if the app was closed on the commit history.
 */

import { getLocalStorage } from '$utils/get-local-storage';
import { setLocalStorage } from '$utils/set-local-storage';

const STORAGE_KEY = 'last-repository';

/**
 * Reads the persisted id, or `undefined` when absent or not a non-empty string.
 * Exported so it is testable on its own: the module-scope read below runs once
 * per app start, which a test can't replay.
 *
 * A remembered id is not proof the repository still exists — callers validate it
 * against the live repository list before navigating to it.
 */
export function readPersistedLastRepository(): string | undefined {
	const stored = getLocalStorage<string>(STORAGE_KEY);
	return typeof stored === 'string' && stored.length > 0 ? stored : undefined;
}

let current = $state<string | undefined>(readPersistedLastRepository());

export const lastRepository = {
	/** The id of the repository open when the app was last used, if any. */
	get current(): string | undefined {
		return current;
	},
	/**
	 * Records the open repository, persisting across sessions. Empty ids are
	 * ignored: `setLocalStorage` removes the key for falsy values, so a route
	 * param that hasn't resolved yet would otherwise erase a good memory.
	 */
	set(id: string) {
		if (!id) return;
		current = id;
		setLocalStorage(STORAGE_KEY, id);
	}
};
