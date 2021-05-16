import { writable } from 'svelte/store';

export const repos = writable<string[]>([]);
