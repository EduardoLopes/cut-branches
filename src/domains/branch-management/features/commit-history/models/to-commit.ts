import type { HistoryCommit } from './commit-graph';
import { Commit } from '$domains/branch-management/core/models/commit';

/**
 * Lifts a history-walk commit into the `Commit` domain model the shared commit
 * card renders.
 *
 * The two shapes differ on purpose: `HistoryCommit` carries graph topology
 * (parents, refs) but no dedicated `summary`, so the subject is derived from
 * the first line of the message. Commands that return subject-only messages
 * therefore round-trip unchanged, while those returning the full message
 * (`listBranchCommits`) yield a summary plus a disclosable body.
 */
export function toCommit(commit: HistoryCommit): Commit {
	return Commit.fromData({
		sha: commit.sha,
		shortSha: commit.shortSha,
		date: commit.date,
		message: commit.message,
		summary: commit.message.split('\n', 1)[0],
		author: commit.author,
		email: commit.email
	});
}
