export const getRepoName = (root_path: string): string => {
	if (root_path.lastIndexOf('\\')) {
		return root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return root_path.substring(root_path.lastIndexOf('/') + 1);
};

export interface ParserBranches {
	current: string;
	branches: string[];
}

export function parseBranches(rowBranches: string): ParserBranches {
	let current: string;
	const branches = rowBranches
		.split('\n')
		.map((item) => {
			if (/\*\s.*/gm.test(item)) {
				current = item.trim().replace('* ', '');
				return item.trim().replace('* ', '');
			}

			return item.trim();
		})
		.filter((item) => item !== '');

	return { current, branches };
}

export const getRepoInfo = async (path: string): Promise<Repo> => {
	const { invoke } = await import('@tauri-apps/api/tauri');

	const res: string = await invoke('git_repo_dir', { path });

	const resParser = JSON.parse(res);
	const root_path = resParser.root_path;
	let name: string;
	const branches = parseBranches(resParser.branches);

	if (root_path.lastIndexOf('/')) {
		name = root_path.substring(root_path.lastIndexOf('/') + 1);
	} else {
		name = root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return {
		path: root_path,
		branches: branches.branches,
		currentBranch: branches.current,
		name
	};
};
