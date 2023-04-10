import type { IBranch, IRepo } from '$lib/stores';
import { toast as svelteToast } from '@zerodevx/svelte-toast';

export const getRepoName = (root_path: string): string => {
	if (root_path.lastIndexOf('\\')) {
		return root_path.substring(root_path.lastIndexOf('\\') + 1);
	}

	return root_path.substring(root_path.lastIndexOf('/') + 1);
};

export interface ParserBranches {
	current: string;
	branches: IBranch[];
}

export const getRepoInfo = async (path: string) => {
	if (!path) return;

	const { invoke } = await import('@tauri-apps/api/tauri');

	return invoke<string>('git_repo_dir', { path }).then((res) => {
		if (res) {
			const resParser = JSON.parse(res) satisfies IRepo;

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

export const toast = {
	success: (message: string): void => {
		svelteToast.push(message, {
			theme: {
				'--toastColor': 'white',
				'--toastBackground': '#799b1c',
				'--toastProgressBackground': '#c5ce3c'
			}
		});
	},
	warning: (message: string): void => {
		svelteToast.push(message, {
			theme: {
				'--toastBackground': '#b59f35',
				'--toastColor': 'white',
				'--toastProgressBackground': '#e6cb43'
			}
		});
	},
	failure: (message: string): void => {
		svelteToast.push(message, {
			theme: {
				'--toastBackground': '#9b1c1c',
				'--toastColor': 'white',
				'--toastProgressBackground': '#f34642'
			}
		});
	}
};
