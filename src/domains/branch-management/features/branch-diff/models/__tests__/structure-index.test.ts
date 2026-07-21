import { describe, expect, it } from 'vitest';
import { buildStructureIndex, listRelatedPaths } from '../structure-index';
import type { FileStructure, GetDiffStructureOutput } from '$infrastructure/bindings';

const file = (path: string, overrides: Partial<FileStructure> = {}): FileStructure => ({
	path,
	language: 'typescript',
	parsed: true,
	changedSymbols: [],
	imports: [],
	...overrides
});

describe('buildStructureIndex', () => {
	it('returns an empty index for missing output', () => {
		expect(buildStructureIndex(undefined).size).toBe(0);
	});

	it('indexes files by path with their changed symbols', () => {
		const output: GetDiffStructureOutput = {
			files: [
				file('src/a.ts', {
					changedSymbols: [{ name: 'run', kind: 'function', startLine: 1, endLine: 3 }]
				}),
				file('src/b.ts')
			],
			edges: []
		};

		const index = buildStructureIndex(output);
		expect(index.get('src/a.ts')?.symbols.map((s) => s.name)).toEqual(['run']);
		expect(index.get('src/b.ts')?.symbols).toEqual([]);
		expect(index.get('missing.ts')).toBeUndefined();
	});

	it('counts outgoing and incoming edges per file', () => {
		const output: GetDiffStructureOutput = {
			files: [file('a.ts'), file('b.ts'), file('c.ts')],
			edges: [
				{ from: 'a.ts', to: 'b.ts', kind: 'import' },
				{ from: 'c.ts', to: 'b.ts', kind: 'import' },
				{ from: 'a.ts', to: 'c.ts', kind: 'import' }
			]
		};

		const index = buildStructureIndex(output);
		expect(index.get('a.ts')).toMatchObject({ importsChanged: 2, importedByChanged: 0 });
		expect(index.get('b.ts')).toMatchObject({ importsChanged: 0, importedByChanged: 2 });
		expect(index.get('c.ts')).toMatchObject({ importsChanged: 1, importedByChanged: 1 });
	});

	it('ignores edges pointing at files missing from the list', () => {
		const output: GetDiffStructureOutput = {
			files: [file('a.ts')],
			edges: [{ from: 'a.ts', to: 'ghost.ts', kind: 'import' }]
		};

		const index = buildStructureIndex(output);
		expect(index.get('a.ts')).toMatchObject({ importsChanged: 1, importedByChanged: 0 });
		expect(index.has('ghost.ts')).toBe(false);
	});

	it('ignores edges whose importer is missing from the list', () => {
		const output: GetDiffStructureOutput = {
			files: [file('a.ts')],
			edges: [{ from: 'ghost.ts', to: 'a.ts', kind: 'import' }]
		};

		const index = buildStructureIndex(output);
		expect(index.get('a.ts')).toMatchObject({ importsChanged: 0, importedByChanged: 1 });
		expect(index.has('ghost.ts')).toBe(false);
	});
	it('lists a file with its direct import neighborhood', () => {
		const edges = [
			{ from: 'a.ts', to: 'b.ts', kind: 'import' as const },
			{ from: 'c.ts', to: 'a.ts', kind: 'import' as const },
			{ from: 'c.ts', to: 'd.ts', kind: 'import' as const }
		];

		// a's neighborhood: itself, what it imports (b), what imports it (c).
		expect([...listRelatedPaths(edges, 'a.ts')].sort()).toEqual(['a.ts', 'b.ts', 'c.ts']);
		// An unconnected file is alone in its neighborhood.
		expect([...listRelatedPaths(edges, 'z.ts')]).toEqual(['z.ts']);
	});
});
