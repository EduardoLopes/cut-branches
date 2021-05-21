import { writable } from 'svelte/store';

export const repos = writable<string[]>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('repos')) : []
);

repos.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('repos', JSON.stringify(value));
	}
});
