import { describe, expect, it } from 'vitest';
import { WorktreePath } from '../worktree-path';

describe('WorktreePath', () => {
	it('accepts a POSIX absolute path', () => {
		const path = new WorktreePath('/repos/wt1');
		expect(path.getValue()).toBe('/repos/wt1');
		expect(path.toString()).toBe('/repos/wt1');
	});

	it('accepts a Windows absolute path', () => {
		expect(new WorktreePath('C:\\repos\\wt1').getValue()).toBe('C:\\repos\\wt1');
		expect(new WorktreePath('D:/repos/wt1').getValue()).toBe('D:/repos/wt1');
	});

	it('trims surrounding whitespace', () => {
		expect(new WorktreePath('  /repos/wt1  ').getValue()).toBe('/repos/wt1');
	});

	it('rejects an empty or whitespace-only path', () => {
		expect(() => new WorktreePath('')).toThrow(/Invalid worktree path/);
		expect(() => new WorktreePath('   ')).toThrow(/Invalid worktree path/);
	});

	it('rejects a relative path', () => {
		expect(() => new WorktreePath('repos/wt1')).toThrow(/Invalid worktree path/);
		expect(() => new WorktreePath('./wt1')).toThrow(/Invalid worktree path/);
	});

	it('rejects a path containing a NUL character', () => {
		expect(() => new WorktreePath('/repos/\x00wt1')).toThrow(/Invalid worktree path/);
	});

	it('compares by value', () => {
		const a = new WorktreePath('/repos/wt1');
		const b = new WorktreePath('/repos/wt1');
		const c = new WorktreePath('/repos/wt2');
		expect(a.equals(b)).toBe(true);
		expect(a.equals(c)).toBe(false);
	});
});
