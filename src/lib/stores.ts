import { get, writable } from 'svelte/store';

export interface IBranch {
	name: string;
	current: boolean;
	fully_merged: boolean;
}
export interface IRepo {
	path: string;
	branches: IBranch[];
	name: string;
	current_branch: string;
}

export interface RepoID {
	path: string;
	id: string;
	name: string;
}

export const repos = writable<RepoID[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos') ?? '[]') : []
);

repos.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('repos', JSON.stringify(value));
	}
});

window.addEventListener('storage', () => {
	const storedValueStr = localStorage.getItem('repos');
	if (storedValueStr == null) return;

	const localValue = JSON.parse(storedValueStr);
	if (localValue !== get(repos)) repos.set(localValue);
});
