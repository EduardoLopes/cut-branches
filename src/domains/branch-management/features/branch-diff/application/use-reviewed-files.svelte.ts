/**
 * Review-progress composable: tracks which changed files the reviewer has
 * marked "reviewed", persisted across sessions per repository + diff target.
 *
 * Delivery-layer UI state — a working checklist over the changeset. Keyed by
 * repo path + target (branch name or commit sha), so switching branch/commit
 * shows that target's own progress and the two never bleed into each other.
 *
 * Content-aware: each mark stores a cheap fingerprint of the file's diff at the
 * moment it was reviewed (its added/removed line counts — already in hand, no
 * extra fetch). A file counts as reviewed only while its CURRENT fingerprint
 * still matches the stored one, so a file that gains further changes silently
 * drops its checkmark and asks to be looked at again — while every unchanged
 * file keeps its mark. (The counts are a coarse fingerprint: an edit that keeps
 * the exact +/- totals slips through. A true diff hash would need a backend
 * round-trip; the counts catch the overwhelmingly common case for free.)
 */

import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod/v4';
import { getValidatedLocalStorage } from '$utils/get-validated-local-storage';
import { setValidatedLocalStorage } from '$utils/set-validated-local-storage';

const STORAGE_PREFIX = 'diff-reviewed';
/** path → fingerprint of the diff when it was marked reviewed. */
const reviewedFilesSchema = z.record(z.string(), z.string());

/** The diff shape a file needs so we can fingerprint what was reviewed. */
export interface ReviewableFile {
	path: string;
	linesAdded: number;
	linesRemoved: number;
}

interface UseReviewedFilesProps {
	getPath: () => string;
	getBranchName: () => string | null;
	getCommitSha: () => string | null;
	/** The current changeset — drives the fingerprint comparison. */
	getFiles: () => ReviewableFile[];
}

/** A file's content fingerprint: cheap, derived from data already loaded. */
export function reviewedFingerprint(file: ReviewableFile): string {
	return `${file.linesAdded}:${file.linesRemoved}`;
}

/**
 * The localStorage key for a repo + target, or null when the target is not yet
 * known (no path, or neither a branch nor a commit selected). A branch target
 * wins over a commit when both are somehow present, matching the query's own
 * precedence.
 */
export function reviewedStorageKey(
	repositoryPath: string,
	branchName: string | null,
	commitSha: string | null
): string | null {
	if (!repositoryPath) {
		return null;
	}
	if (branchName) {
		return `${STORAGE_PREFIX}:${repositoryPath}:branch:${branchName}`;
	}
	if (commitSha) {
		return `${STORAGE_PREFIX}:${repositoryPath}:commit:${commitSha}`;
	}
	return null;
}

export interface ReviewedFiles {
	/** How many current files are reviewed and unchanged (reactive). */
	readonly count: number;
	/** Whether a path is marked reviewed AND unchanged since (reactive). */
	isReviewed(path: string): boolean;
	/** Flip a file's reviewed state (re-fingerprinting on mark) and persist. */
	toggle(path: string): void;
	/** Mark every given path reviewed at its current fingerprint and persist. */
	markAllReviewed(paths: string[]): void;
	/** Clear all reviewed marks for the current target and persist. */
	clearReviewed(): void;
}

export function useReviewedFiles({
	getPath,
	getBranchName,
	getCommitSha,
	getFiles
}: UseReviewedFilesProps): ReviewedFiles {
	/** path → stored fingerprint at the time it was marked reviewed. */
	const marks = new SvelteMap<string, string>();
	/** The key the in-memory marks currently mirror — the one `persist` writes. */
	let currentKey: string | null = null;

	// Hydrate whenever the target changes: swap the marks to the stored progress
	// for the new key. Only the getters are reactive dependencies here — the
	// mutations below don't re-trigger this, so toggling never reloads.
	$effect(() => {
		const key = reviewedStorageKey(getPath(), getBranchName(), getCommitSha());
		currentKey = key;
		marks.clear();
		if (key) {
			const stored = getValidatedLocalStorage(key, reviewedFilesSchema, {});
			for (const [path, fingerprint] of Object.entries(stored.data ?? {})) {
				marks.set(path, fingerprint);
			}
		}
	});

	// Current fingerprints of the files on screen, as a plain lookup object
	// (reactive through `getFiles`). A file counts as reviewed only while its
	// current fingerprint matches the one stored when it was marked.
	const fingerprints = $derived<Record<string, string>>(
		Object.fromEntries(getFiles().map((file) => [file.path, reviewedFingerprint(file)]))
	);

	/** Live count of marks that still match the current diff. */
	const count = $derived(
		[...marks].filter(([path, fingerprint]) => fingerprints[path] === fingerprint).length
	);

	function persist(): void {
		if (currentKey) {
			setValidatedLocalStorage(currentKey, Object.fromEntries(marks), reviewedFilesSchema);
		}
	}

	function isReviewed(path: string): boolean {
		const stored = marks.get(path);
		return stored !== undefined && stored === fingerprints[path];
	}

	function toggle(path: string): void {
		if (isReviewed(path)) {
			// Effectively reviewed → un-review.
			marks.delete(path);
		} else {
			// Not reviewed (or stale) → (re-)mark at the current fingerprint.
			marks.set(path, fingerprints[path] ?? '');
		}
		persist();
	}

	function markAllReviewed(paths: string[]): void {
		for (const path of paths) {
			marks.set(path, fingerprints[path] ?? '');
		}
		persist();
	}

	function clearReviewed(): void {
		marks.clear();
		persist();
	}

	return {
		get count() {
			return count;
		},
		isReviewed,
		toggle,
		markAllReviewed,
		clearReviewed
	};
}
