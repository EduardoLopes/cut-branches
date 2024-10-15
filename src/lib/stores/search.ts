import debounceIt from 'just-debounce-it';
import { derived, get, writable } from 'svelte/store';

interface Search {
	[key: string]: string | undefined;
}

export const search = writable<Search>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('search') ?? '{}') : {}
);

search.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('search', JSON.stringify(value));
	}
});

window.addEventListener('storage', () => {
	const storedValueStr = localStorage.getItem('search');
	if (storedValueStr == null) {
		search.set({});
		return;
	}

	const localValue = JSON.parse(storedValueStr);
	if (localValue !== get(search)) {
		search.set(localValue);
	}
});

export function createSearch(repository?: string | null) {
	const query = derived(search, ($search) => (repository ? $search[repository] : undefined));

	const debounce = debounceIt((value: string) => {
		search.update((search) => {
			return { ...search, ...{ [`${repository}`]: value } };
		});
	}, 300);

	const set = (value: string) => {
		if (repository) {
			debounce(value);
		}
	};

	const clear = () => {
		if (repository) {
			search.update((search) => {
				return { ...search, ...{ [`${repository}`]: undefined } };
			});
		}
	};

	return { set, clear, query };
}
