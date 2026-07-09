import { describe, expect, it } from 'vitest';
import { Worktree } from '../worktree';
import type { Worktree as WorktreeData } from '$infrastructure/bindings';

function data(overrides: Partial<WorktreeData> = {}): WorktreeData {
	return {
		name: 'wt1',
		path: '/repos/wt1',
		branch: 'feature',
		headSha: 'abc1234567890def',
		isLocked: false,
		lockReason: null,
		isMain: false,
		isPrunable: false,
		...overrides
	};
}

describe('Worktree', () => {
	it('exposes every field via accessors', () => {
		const wt = Worktree.fromData(data());
		expect(wt.getName()).toBe('wt1');
		expect(wt.getPath()).toBe('/repos/wt1');
		expect(wt.getBranch()).toBe('feature');
		expect(wt.getHeadSha()).toBe('abc1234567890def');
		expect(wt.getShortSha()).toBe('abc1234');
		expect(wt.isLocked()).toBe(false);
		expect(wt.getLockReason()).toBeNull();
		expect(wt.isMain()).toBe(false);
		expect(wt.isPrunable()).toBe(false);
	});

	it('round-trips to its wire DTO', () => {
		const dto = data({ isLocked: true, lockReason: 'busy' });
		expect(Worktree.fromData(dto).toData()).toEqual(dto);
	});

	it('returns null short sha when HEAD is unresolved', () => {
		const wt = Worktree.fromData(data({ headSha: null }));
		expect(wt.getShortSha()).toBeNull();
		expect(wt.getHeadSha()).toBeNull();
	});

	it('reports the main worktree and lock details', () => {
		const wt = Worktree.fromData(
			data({ isMain: true, isLocked: true, lockReason: 'in use', isPrunable: true })
		);
		expect(wt.isMain()).toBe(true);
		expect(wt.isLocked()).toBe(true);
		expect(wt.getLockReason()).toBe('in use');
		expect(wt.isPrunable()).toBe(true);
	});

	it('handles a detached worktree with no branch', () => {
		const wt = Worktree.fromData(data({ branch: null }));
		expect(wt.getBranch()).toBeNull();
	});

	it('compares by name and path', () => {
		const a = Worktree.fromData(data());
		const same = Worktree.fromData(data({ branch: 'other' }));
		const differentPath = Worktree.fromData(data({ path: '/repos/other' }));
		const differentName = Worktree.fromData(data({ name: 'wt2' }));
		expect(a.equals(same)).toBe(true);
		expect(a.equals(differentPath)).toBe(false);
		expect(a.equals(differentName)).toBe(false);
	});
});
