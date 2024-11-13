import { untrack } from 'svelte';
import { setLocalStorage } from './set-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class Store<T> {
	private static instances: { [key: string]: Store<unknown> } = {};

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = $state<T | undefined>(this.#getLocalStorage());

	constructor(key?: string) {
		this.#key = key;

		this.updateFromLocalStorage();
	}

	set(value: T) {
		this.state = value;
		this.#updateLocalStorage();
	}

	updateFromLocalStorage() {
		this.state = this.#getLocalStorage();
	}

	clear() {
		this.state = undefined;
		this.#updateLocalStorage();
	}

	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#key) {
			try {
				setLocalStorage(this.localStorageKey, this.state);
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): T {
		const parsedData: T = getLocalStorage(this.localStorageKey);
		return parsedData;
	}

	public static getInstance<T>(...args: (string | number)[]): Store<T> {
		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new this<T>(storageKey);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as Store<T>;
	}
}
