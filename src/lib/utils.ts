import type { Branch, Repo } from '$lib/stores';

export const getRepoName = (root_path: string): string => {
	if (root_path.lastIndexOf('\\')) {
		return root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return root_path.substring(root_path.lastIndexOf('/') + 1);
};

export interface ParserBranches {
	current: string;
	branches: Branch[];
}

export interface DeletedBranches {
	result: string[];
	errors: string[];
}

export const deleteBranches = async (
	path: string,
	branches: Branch[]
): Promise<DeletedBranches> => {
	const { invoke } = await import('@tauri-apps/api/tauri');

	const res: string = await invoke('delete_branches', {
		DeleteOptions: [
			path,
			branches
				.map((item) => item.name)
				.toString()
				.replace(/,/g, ' ')
				.trim()
		]
	});

	const resParser = JSON.parse(res);

	const errors = resParser.errors
		.trim()
		.split('\n')
		.map((item: string) => item.trim());
	const result = resParser.result
		.trim()
		.split('\n')
		.map((item: string) => item.trim());

	if (resParser.errors.length > 0) return Promise.reject(errors);

	return {
		result,
		errors
	};
};

export const getRepoInfo = async (path: string): Promise<Repo> => {
	if (!path) return;

	const { invoke } = await import('@tauri-apps/api/tauri');

	const res: string = await invoke('git_repo_dir', { path });

	const resParser = JSON.parse(res);

	const errors = resParser.errors;

	if (errors.length > 0) return Promise.reject(errors);

	const root_path = resParser.root_path;
	let name: string;

	if (root_path.lastIndexOf('/')) {
		name = root_path.substring(root_path.lastIndexOf('/') + 1);
	} else {
		name = root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return {
		path: root_path,
		branches: resParser.branches,
		name
	};
};
