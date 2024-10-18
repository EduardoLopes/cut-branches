import { get, writable } from 'svelte/store';

interface Selected {
	[key: string]: string[];
}

export const selected = writable<Selected>(
	typeof window !== 'undefined' ? JSON.parse(localStorage?.getItem('selected') ?? '{}') : {}
);

selected.subscribe((value) => {
	if (typeof window !== 'undefined') {
		localStorage?.setItem('selected', JSON.stringify(value));
	}
});

window.addEventListener('storage', () => {
	const storedValueStr = localStorage.getItem('selected');
	if (storedValueStr == null) {
		selected.set({});
		return;
	}

	const localValue = JSON.parse(storedValueStr);
	if (localValue !== get(selected)) {
		selected.set(localValue);
	}
});

export function createSelected(repository?: string | null) {
	const add = (branch: string[]) => {
		if (repository) {
			selected.update((value) => {
				const ids = value[repository] ?? [];

				ids.push(...branch);

				const uniqueIds = Array.from(new Set(ids));
				return { ...value, ...{ [`${repository}`]: uniqueIds } };
			});
		}
	};

	const clear = () => {
		if (repository) {
			selected.update((value) => {
				return { ...value, ...{ [`${repository}`]: [] } };
			});
		}
	};

	const remove = (branches: string[]) => {
		if (repository) {
			selected.update((value) => {
				const ids = value[repository] ?? [];

				const newIds = ids.filter((item) => !branches.includes(item));

				return { ...value, ...{ [`${repository}`]: newIds } };
			});
		}
	};

	const has = (branch: string) => {
		if (repository) {
			const ids = get(selected)[repository] ?? [];
			return ids.includes(branch);
		}
		return false;
	};

	return { add, remove, clear, has };
}
