import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { setLocalStorage } from './set-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class MapStore<K, V> {
	private static instances: { [key: string]: MapStore<unknown, unknown> } = {};

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = this.#getLocalStorage();

	list = $derived<V[]>(Array.from(this.state.values()));

	constructor(key?: string) {
		this.#key = key;

		this.updateFromLocalStorage();
	}

	set(key: K, value: V) {
		this.state.set(key, value);
		this.#updateLocalStorage();
	}

	delete(keys: K[]) {
		keys.forEach((key) => this.state.delete(key));
		this.#updateLocalStorage();
	}

	updateFromLocalStorage() {
		this.state = this.#getLocalStorage();
	}

	clear() {
		this.state.clear();
		this.#updateLocalStorage();
	}

	has(key: K): boolean {
		return this.state.has(key);
	}

	get(key: K): V | undefined {
		return this.state.get(key);
	}

	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#key) {
			try {
				setLocalStorage(this.localStorageKey, [...this.state.entries()]);
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): SvelteMap<K, V> {
		const parsedData: [K, V][] = getLocalStorage(this.localStorageKey, []);
		return new SvelteMap(parsedData);
	}

	public static getInstance<K, V>(...args: (string | number)[]): MapStore<K, V> {
		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new MapStore<K, V>(storageKey);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as MapStore<K, V>;
	}
}
