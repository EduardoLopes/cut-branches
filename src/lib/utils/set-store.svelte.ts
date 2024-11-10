// eslint-disable-next-line import/no-duplicates
import { untrack } from 'svelte';
// eslint-disable-next-line import/no-duplicates
import { SvelteSet } from 'svelte/reactivity';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class SetStore<T> {
	private static instances: { [key: string]: SetStore<unknown> } = {};

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = this.#getLocalStorage();

	list = $derived(Array.from(this.state));

	constructor(key?: string) {
		this.#key = key;

		this.updateFromLocalStorage();
	}

	add(items: T[]) {
		items.forEach((item) => this.state.add(item));
		this.#updateLocalStorage();
	}

	delete(items: T[]) {
		items.forEach((item) => this.state.delete(item));
		this.#updateLocalStorage();
	}

	updateFromLocalStorage() {
		this.state = this.#getLocalStorage();
	}

	clear() {
		this.state.clear();
		this.#updateLocalStorage();
	}

	has(item: T): boolean {
		return this.state.has(item);
	}

	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#key) {
			try {
				const stateArray = [...this.state];
				localStorage?.setItem(this.localStorageKey, JSON.stringify(stateArray));
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): SvelteSet<T> {
		const parsedData: T[] = getLocalStorage(this.localStorageKey, []);
		return new SvelteSet(parsedData);
	}

	public static getInstance<T>(...args: (string | number)[]): SetStore<T> {
		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a atorage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new SetStore<T>(storageKey);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as SetStore<T>;
	}
}
