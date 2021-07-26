import { writable } from 'svelte/store';

export interface Branch {
	name: string;
	fullyMerged?: boolean;
}
export interface Repo {
	path: string;
	branches: Branch[];
	name: string;
	currentBranch: Branch;
}

export const repos = writable<Repo[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos')) ?? [] : []
);

export const currentRepo = writable<Repo>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('currentRepo')) ?? {} : {}
);

repos.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('repos', JSON.stringify(value));
	}
});

currentRepo.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('currentRepo', JSON.stringify(value));
	}
});
