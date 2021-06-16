import { writable } from 'svelte/store';

export interface Repo {
	path: string;
	branches: string[];
	name: string;
	currentBranch: string;
}

export const repos = writable<Repo[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos')) ?? [] : []
);

repos.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('repos', JSON.stringify(value));
	}
});
