/**
 * Shared, in-memory summary of how much disk space the cleanup feature could
 * reclaim across all stale repositories.
 *
 * This is the cross-domain seam (§1.5): the `repository-cleanup` domain writes
 * it after a scan, and the `repository-navigation` sidebar reads it to render a
 * badge — without either domain importing the other. It lives in `$lib` because
 * it is globally-shared, stateful, framework-dependent logic.
 */

let reclaimableBytes = $state<number | undefined>(undefined);

export const cleanupSummary = {
	/** Total reclaimable bytes from the most recent scan, or `undefined` if never scanned. */
	get reclaimableBytes(): number | undefined {
		return reclaimableBytes;
	},
	/** Record the latest total reclaimable bytes. */
	set(bytes: number) {
		reclaimableBytes = bytes;
	},
	/** Forget the current summary (e.g. when the cleanup feature is disabled). */
	clear() {
		reclaimableBytes = undefined;
	}
};
