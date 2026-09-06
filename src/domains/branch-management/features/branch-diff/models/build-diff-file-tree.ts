import type { ChangedFile } from '$infrastructure/bindings';

/**
 * A node of the changed-files tree. Directories carry `children`; files carry
 * the original {@link ChangedFile}. `path` is the full path from the repo root
 * and doubles as the node's unique id.
 */
export interface DiffFileTreeNode {
	/** Full path from the repository root — unique within the tree. */
	path: string;
	/** Display label: the file name, or the (possibly compressed) dir run. */
	label: string;
	/** The changed file — present on leaves only. */
	file?: ChangedFile;
	/** Child nodes — present on directories only. */
	children?: DiffFileTreeNode[];
}

interface MutableDir {
	path: string;
	label: string;
	dirs: Map<string, MutableDir>;
	files: DiffFileTreeNode[];
}

/**
 * Build a directory tree from the flat changed-file list. Runs of
 * single-child directories collapse into one node (`src/ui/patterns`) so deep
 * paths don't waste horizontal space, directories sort before files, and both
 * sort alphabetically.
 */
export function buildDiffFileTree(files: ChangedFile[]): DiffFileTreeNode[] {
	const root: MutableDir = { path: '', label: '', dirs: new Map(), files: [] };

	for (const file of files) {
		const segments = file.path.split('/');
		const name = segments.pop() as string;
		let dir = root;
		for (const segment of segments) {
			let child = dir.dirs.get(segment);
			if (!child) {
				child = {
					path: dir.path === '' ? segment : `${dir.path}/${segment}`,
					label: segment,
					dirs: new Map(),
					files: []
				};
				dir.dirs.set(segment, child);
			}
			dir = child;
		}
		dir.files.push({ path: file.path, label: name, file });
	}

	return finalize(root);
}

/** Sort and freeze a directory's children, compressing single-child chains. */
function finalize(dir: MutableDir): DiffFileTreeNode[] {
	const dirs = [...dir.dirs.values()]
		.map(compress)
		.sort((a, b) => a.label.localeCompare(b.label))
		.map((d): DiffFileTreeNode => ({
			path: d.path,
			label: d.label,
			children: finalize(d)
		}));
	const files = [...dir.files].sort((a, b) => a.label.localeCompare(b.label));
	return [...dirs, ...files];
}

/** Fold `a/b/c` runs where every level holds a single child directory. */
function compress(dir: MutableDir): MutableDir {
	let current = dir;
	let label = dir.label;
	while (current.files.length === 0 && current.dirs.size === 1) {
		const only = current.dirs.values().next().value as MutableDir;
		label = `${label}/${only.label}`;
		current = only;
	}
	return { ...current, label };
}
