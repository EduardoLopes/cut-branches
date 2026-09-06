import { flushSync } from 'svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import {
	reviewedFingerprint,
	reviewedStorageKey,
	useReviewedFiles,
	type ReviewableFile
} from '../use-reviewed-files.svelte';
import { reactiveHolder } from './reactive-holder.svelte';
import { withEffectRoot } from '$lib/with-effect-root.svelte';

beforeEach(() => {
	localStorage.clear();
});

const file = (path: string, linesAdded = 1, linesRemoved = 1): ReviewableFile => ({
	path,
	linesAdded,
	linesRemoved
});

describe('reviewedFingerprint', () => {
	it('combines the added and removed line counts', () => {
		expect(reviewedFingerprint(file('src/a.ts', 20, 4))).toBe('20:4');
	});
});

describe('reviewedStorageKey', () => {
	it('keys by branch when a branch target is set', () => {
		expect(reviewedStorageKey('/repo', 'feature/x', null)).toBe(
			'diff-reviewed:/repo:branch:feature/x'
		);
	});

	it('keys by commit when no branch is set', () => {
		expect(reviewedStorageKey('/repo', null, 'abc1234')).toBe('diff-reviewed:/repo:commit:abc1234');
	});

	it('prefers the branch when both are somehow present', () => {
		expect(reviewedStorageKey('/repo', 'feature/x', 'abc1234')).toBe(
			'diff-reviewed:/repo:branch:feature/x'
		);
	});

	it('returns null without a repository path or a target', () => {
		expect(reviewedStorageKey('', 'feature/x', null)).toBeNull();
		expect(reviewedStorageKey('/repo', null, null)).toBeNull();
	});
});

describe('useReviewedFiles', () => {
	const setup = (
		initial: {
			path?: string;
			branchName?: string | null;
			commitSha?: string | null;
			files?: ReviewableFile[];
		} = {}
	) => {
		const path = reactiveHolder(initial.path ?? '/repo');
		const branchName = reactiveHolder<string | null>(initial.branchName ?? 'feature/x');
		const commitSha = reactiveHolder<string | null>(initial.commitSha ?? null);
		const files = reactiveHolder<ReviewableFile[]>(
			initial.files ?? [file('src/a.ts', 20, 4), file('src/b.ts', 10, 0)]
		);
		const root = withEffectRoot(() =>
			useReviewedFiles({
				getPath: () => path.value,
				getBranchName: () => branchName.value,
				getCommitSha: () => commitSha.value,
				getFiles: () => files.value
			})
		);
		flushSync();
		return { path, branchName, commitSha, files, api: root.value, cleanup: root.cleanup };
	};

	const readStored = (key = 'diff-reviewed:/repo:branch:feature/x') =>
		JSON.parse(localStorage.getItem(key) ?? '{}');

	it('starts empty when nothing is stored', () => {
		const { api, cleanup } = setup();
		expect(api.count).toBe(0);
		expect(api.isReviewed('src/a.ts')).toBe(false);
		cleanup();
	});

	it('toggles a file on and off, persisting the fingerprint', () => {
		const { api, cleanup } = setup();

		api.toggle('src/a.ts');
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(true);
		expect(api.count).toBe(1);
		// Stored with the fingerprint of the file at review time.
		expect(readStored()).toEqual({ 'src/a.ts': '20:4' });

		api.toggle('src/a.ts');
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(false);
		expect(api.count).toBe(0);
		expect(readStored()).toEqual({});
		cleanup();
	});

	it('drops a mark once the file changes, keeping unchanged marks', () => {
		const { api, files, cleanup } = setup();

		api.markAllReviewed(['src/a.ts', 'src/b.ts']);
		flushSync();
		expect(api.count).toBe(2);

		// src/a.ts gains further changes — its fingerprint no longer matches.
		files.value = [file('src/a.ts', 25, 6), file('src/b.ts', 10, 0)];
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(false);
		expect(api.isReviewed('src/b.ts')).toBe(true);
		expect(api.count).toBe(1);
		cleanup();
	});

	it('re-marks a changed file at its new fingerprint', () => {
		const { api, files, cleanup } = setup();

		api.toggle('src/a.ts');
		flushSync();
		files.value = [file('src/a.ts', 25, 6), file('src/b.ts', 10, 0)];
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(false);

		// Reviewing the new state stores the new fingerprint.
		api.toggle('src/a.ts');
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(true);
		expect(readStored()).toEqual({ 'src/a.ts': '25:6' });
		cleanup();
	});

	it('stores an empty fingerprint for a path absent from the changeset', () => {
		// Defensive: toggling/marking a path with no current diff entry falls
		// back to an empty fingerprint, so it can never read back as reviewed.
		const { api, cleanup } = setup();

		api.toggle('src/ghost.ts');
		flushSync();
		expect(api.isReviewed('src/ghost.ts')).toBe(false);
		expect(readStored()).toEqual({ 'src/ghost.ts': '' });

		api.markAllReviewed(['src/phantom.ts']);
		flushSync();
		expect(readStored()).toEqual({ 'src/ghost.ts': '', 'src/phantom.ts': '' });
		expect(api.count).toBe(0);
		cleanup();
	});

	it('marks many files reviewed at once', () => {
		const { api, cleanup } = setup();

		api.markAllReviewed(['src/a.ts', 'src/b.ts', 'src/a.ts']);
		flushSync();
		expect(api.count).toBe(2);
		expect(api.isReviewed('src/b.ts')).toBe(true);
		cleanup();
	});

	it('clears every mark for the target', () => {
		const { api, cleanup } = setup();

		api.markAllReviewed(['src/a.ts', 'src/b.ts']);
		flushSync();
		api.clearReviewed();
		flushSync();
		expect(api.count).toBe(0);
		expect(readStored()).toEqual({});
		cleanup();
	});

	it('restores stored progress for the current target on init', () => {
		localStorage.setItem(
			'diff-reviewed:/repo:branch:feature/x',
			JSON.stringify({ 'src/a.ts': '20:4', 'src/b.ts': '10:0' })
		);
		const { api, cleanup } = setup();
		expect(api.count).toBe(2);
		expect(api.isReviewed('src/a.ts')).toBe(true);
		cleanup();
	});

	it('ignores a restored mark whose fingerprint no longer matches', () => {
		// Stored against an older diff shape than the file now has.
		localStorage.setItem(
			'diff-reviewed:/repo:branch:feature/x',
			JSON.stringify({ 'src/a.ts': '2:2' })
		);
		const { api, cleanup } = setup();
		expect(api.isReviewed('src/a.ts')).toBe(false);
		expect(api.count).toBe(0);
		cleanup();
	});

	it('swaps to the new target progress when the branch changes', () => {
		localStorage.setItem(
			'diff-reviewed:/repo:branch:other',
			JSON.stringify({ 'src/b.ts': '10:0' })
		);
		const { branchName, api, cleanup } = setup();

		api.toggle('src/a.ts');
		flushSync();
		expect(api.isReviewed('src/a.ts')).toBe(true);

		branchName.value = 'other';
		flushSync();
		// The feature-branch mark is gone; the other branch's mark is loaded.
		expect(api.isReviewed('src/a.ts')).toBe(false);
		expect(api.isReviewed('src/b.ts')).toBe(true);
		cleanup();
	});

	it('does not persist while the target is unresolved', () => {
		const { api, cleanup } = setup({ path: '', branchName: null, commitSha: null });

		api.toggle('src/a.ts');
		flushSync();
		// The mark is held in memory, but nothing is written without a key.
		expect(api.isReviewed('src/a.ts')).toBe(true);
		expect(localStorage.length).toBe(0);
		cleanup();
	});

	it('ignores a corrupt stored payload and starts clean', () => {
		localStorage.setItem(
			'diff-reviewed:/repo:branch:feature/x',
			JSON.stringify(['not', 'a', 'map'])
		);
		const { api, cleanup } = setup();
		expect(api.count).toBe(0);
		cleanup();
	});
});
