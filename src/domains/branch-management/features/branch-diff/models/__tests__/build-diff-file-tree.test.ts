import { describe, expect, it } from 'vitest';
import { buildDiffFileTree } from '../build-diff-file-tree';
import type { ChangedFile } from '$infrastructure/bindings';

const file = (path: string): ChangedFile => ({
	path,
	oldPath: null,
	status: 'modified',
	linesAdded: 1,
	linesRemoved: 1,
	isBinary: false
});

describe('buildDiffFileTree', () => {
	it('returns an empty tree for no files', () => {
		expect(buildDiffFileTree([])).toEqual([]);
	});

	it('keeps root-level files as leaves with their file attached', () => {
		const readme = file('README.md');
		const tree = buildDiffFileTree([readme]);

		expect(tree).toHaveLength(1);
		expect(tree[0]).toMatchObject({ path: 'README.md', label: 'README.md', file: readme });
		expect(tree[0].children).toBeUndefined();
	});

	it('groups files under their shared directories', () => {
		const tree = buildDiffFileTree([file('src/a.ts'), file('src/b.ts')]);

		expect(tree).toHaveLength(1);
		expect(tree[0]).toMatchObject({ path: 'src', label: 'src' });
		expect(tree[0].children?.map((n) => n.label)).toEqual(['a.ts', 'b.ts']);
	});

	it('compresses runs of single-child directories into one node', () => {
		const tree = buildDiffFileTree([file('src/ui/patterns/diff-viewer/render-plan.ts')]);

		expect(tree).toHaveLength(1);
		expect(tree[0].label).toBe('src/ui/patterns/diff-viewer');
		expect(tree[0].path).toBe('src/ui/patterns/diff-viewer');
		expect(tree[0].children?.[0]).toMatchObject({
			path: 'src/ui/patterns/diff-viewer/render-plan.ts',
			label: 'render-plan.ts'
		});
	});

	it('stops compressing where a directory has a file of its own', () => {
		const tree = buildDiffFileTree([file('src/mod.rs'), file('src/git/branch.rs')]);

		expect(tree[0].label).toBe('src');
		expect(tree[0].children?.map((n) => n.label)).toEqual(['git', 'mod.rs']);
	});

	it('stops compressing where a directory branches into two', () => {
		const tree = buildDiffFileTree([file('src/a/one.ts'), file('src/b/two.ts')]);

		expect(tree[0].label).toBe('src');
		expect(tree[0].children?.map((n) => n.label)).toEqual(['a', 'b']);
	});

	it('sorts directories before files, both alphabetically', () => {
		const tree = buildDiffFileTree([
			file('zeta.ts'),
			file('alpha.ts'),
			file('lib/one.ts'),
			file('app/two.ts')
		]);

		expect(tree.map((n) => n.label)).toEqual(['app', 'lib', 'alpha.ts', 'zeta.ts']);
	});

	it('uses full paths as unique node ids at every level', () => {
		const tree = buildDiffFileTree([file('a/x/f.ts'), file('b/x/f.ts')]);

		expect(tree.map((n) => n.path)).toEqual(['a/x', 'b/x']);
		expect(tree[0].children?.[0].path).toBe('a/x/f.ts');
		expect(tree[1].children?.[0].path).toBe('b/x/f.ts');
	});
});
