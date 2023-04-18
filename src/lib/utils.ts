import type { IBranch, IRepo } from '$lib/stores';

import frenchToast, { type Renderable } from 'svelte-french-toast';

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
	success: (message: Renderable): void => {
		frenchToast.success(message, {
			position: 'top-right',
			style:
				'border: 1px solid var(--color-success-10); border-radius: 4px; transition: all 150ms cubic-bezier(0.860, 0.000, 0.070, 1.000);',
			iconTheme: {
				primary: '#713200',
				secondary: '#FFFAEE'
			}
		});
	},
	error: (message: Renderable): void => {
		frenchToast.error(message, {
			position: 'top-right',
			style:
				'border: 1px solid var(--color-danger-6); background: var(--color-danger-3); border-radius: 4px; transition: all 150ms cubic-bezier(0.860, 0.000, 0.070, 1.000);',
			iconTheme: {
				primary: 'var(--color-danger-10)',
				secondary: '#FFFAEE'
			}
		});
	}
};
