import { writable } from 'svelte/store';

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

export const repos = writable<IRepo[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos')) ?? [] : []
);

export const currentRepo = writable<IRepo>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('currentRepo')) ?? {} : {}
);

export const loadingRepoInfo = writable<boolean>(false);

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
