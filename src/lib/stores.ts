import { writable } from 'svelte/store';

export const repos = writable<string[]>(JSON.parse(localStorage.getItem('repos')) || []);

repos.subscribe((value) => localStorage.setItem('repos', JSON.stringify(value)));
