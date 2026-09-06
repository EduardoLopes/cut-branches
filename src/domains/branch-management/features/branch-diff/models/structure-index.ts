import type {
	ChangedSymbol,
	GetDiffStructureOutput,
	StructureEdge
} from '$infrastructure/bindings';

/**
 * Per-file view of the structure analysis: the symbols the diff touched and
 * how the file relates to the OTHER changed files (import edge counts).
 */
export interface FileStructureInfo {
	symbols: ChangedSymbol[];
	/** How many other changed files this file imports. */
	importsChanged: number;
	/** How many other changed files import this file. */
	importedByChanged: number;
}

/**
 * Indexes a structure analysis by file path so rows and canvas nodes can
 * look their file up in O(1). Undefined output (query still loading, or
 * failed) yields an empty index — consumers render without structure data.
 */
/**
 * The file plus everything directly related to it by an import edge —
 * the neighborhood the canvas shows while a file is focused.
 */
export function listRelatedPaths(edges: StructureEdge[], path: string): Set<string> {
	const related = new Set<string>([path]);
	for (const edge of edges) {
		if (edge.from === path) {
			related.add(edge.to);
		}
		if (edge.to === path) {
			related.add(edge.from);
		}
	}
	return related;
}

export function buildStructureIndex(
	output: GetDiffStructureOutput | undefined
): Map<string, FileStructureInfo> {
	const index = new Map<string, FileStructureInfo>();
	if (!output) {
		return index;
	}

	for (const file of output.files) {
		index.set(file.path, {
			symbols: file.changedSymbols,
			importsChanged: 0,
			importedByChanged: 0
		});
	}

	for (const edge of output.edges) {
		const from = index.get(edge.from);
		if (from) {
			from.importsChanged += 1;
		}
		const to = index.get(edge.to);
		if (to) {
			to.importedByChanged += 1;
		}
	}

	return index;
}
