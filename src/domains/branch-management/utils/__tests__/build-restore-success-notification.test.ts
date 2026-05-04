import { describe, test, expect } from 'vitest';
import { buildRestoreSuccessNotification } from '../build-restore-success-notification';
import type { Branch, RestoreBranchResult } from '$infrastructure/bindings';

function makeResult(name: string, shortSha: string | null = 'abc1234'): RestoreBranchResult {
	const branch: Branch | null = shortSha
		? {
				name,
				current: false,
				lastCommit: {
					sha: 'fullsha',
					shortSha,
					date: '2024-01-01',
					message: 'm',
					author: 'a',
					email: 'e@x'
				},
				fullyMerged: false,
				deletedAt: null,
				isReachable: null,
				isSelected: false,
				isLocked: false
			}
		: null;
	return {
		branchName: name,
		success: true,
		skipped: false,
		requiresUserAction: false,
		message: '',
		conflictDetails: null,
		branch
	};
}

describe('buildRestoreSuccessNotification', () => {
	test('returns null when no branches restored', () => {
		expect(buildRestoreSuccessNotification([], 'repo')).toBeNull();
	});

	test('uses singular title for one branch', () => {
		const n = buildRestoreSuccessNotification([makeResult('feat-a')], 'my-repo');
		expect(n).not.toBeNull();
		expect(n?.title).toBe('Branch restored to my-repo repository');
		expect(n?.feedback).toBe('success');
		expect(n?.message).toBe('- **feat-a** (at abc1234)');
	});

	test('uses plural title for multiple branches', () => {
		const n = buildRestoreSuccessNotification(
			[makeResult('feat-a'), makeResult('feat-b', 'def5678')],
			'my-repo'
		);
		expect(n?.title).toBe('Branches restored to my-repo repository');
		expect(n?.message).toBe('- **feat-a** (at abc1234)\n\n- **feat-b** (at def5678)');
	});

	test('handles missing branch payload gracefully', () => {
		const n = buildRestoreSuccessNotification([makeResult('feat-a', null)], 'my-repo');
		expect(n?.message).toBe('- **feat-a** (at )');
	});

	test('handles undefined repository name', () => {
		const n = buildRestoreSuccessNotification([makeResult('feat-a')], undefined);
		expect(n?.title).toBe('Branch restored to  repository');
	});
});
