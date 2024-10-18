import { get, writable } from 'svelte/store';

export interface Branch {
	name: string;
	current: boolean;
	fully_merged: boolean;
}
export interface Repository {
	path: string;
	branches: Branch[];
	name: string;
	current_branch: string;
}

export interface RepositoryDetails {
	path: string;
	id: string;
	name: string;
	branchesCount?: number;
}

export const repos = writable<RepositoryDetails[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos') ?? '[]') : []
);

repos.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('repos', JSON.stringify(value));
	}
});

window.addEventListener('storage', () => {
	const storedValueStr = localStorage.getItem('repos');
	if (storedValueStr == null) {
		repos.set([]);
		return;
	}

	const localValue = JSON.parse(storedValueStr);
	if (localValue !== get(repos)) repos.set(localValue);
});
