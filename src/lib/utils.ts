export const getRepoName = (root_path: string): string => {
	if (root_path.lastIndexOf('\\')) {
		return root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return root_path.substring(root_path.lastIndexOf('/') + 1);
};
