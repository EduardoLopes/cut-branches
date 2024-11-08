import { invoke } from '@tauri-apps/api/core';
import type { Branch, Repository } from '$lib/stores/repositories.svelte';

/**
 * Retrieves an item from localStorage and parses it into the specified type.
 * If the code is not running in a browser environment or if there is an error during parsing,
 * a default value is returned.
 *
 * @param key - The key of the item to retrieve from localStorage.
 * @param defaultValue - The default value to return if the item is not available or an error occurs.
 * @returns The parsed item from localStorage, or the default value if not available or an error occurs.
 */
export function getLocalStorage<T>(key: string, defaultValue: T): T {
	if (typeof window !== 'undefined') {
		try {
			const data = localStorage?.getItem(key);
			return data ? JSON.parse(data) : defaultValue;
		} catch (error) {
			console.error(`Error parsing localStorage data for key "${key}":`, error);
			return defaultValue;
		}
	}
	return defaultValue;
}

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

export const getRepoInfo = async (path: string) => {
	if (!path) return;

	return invoke<string>('git_repo_dir', { path }).then((res) => {
		if (res) {
			const resParser = JSON.parse(res) satisfies Repository;

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
				name,
				current_branch: resParser.current_branch
			};
		}
	});
};
