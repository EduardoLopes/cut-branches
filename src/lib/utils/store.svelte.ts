import { untrack } from 'svelte';
import { z } from 'zod';
import { setValidatedLocalStorage } from './set-validated-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class Store<T> {
	private static instances: { [key: string]: Store<unknown> } = {};
	private schema: z.ZodSchema<T>;

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = $state<T | undefined>(this.#getLocalStorage());

	constructor(key?: string, schema?: z.ZodSchema<T>) {
		this.#key = key;
		// Default schema allows any data type if not provided
		this.schema = schema || (z.any() as z.ZodSchema<T>);

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
				const result = setValidatedLocalStorage(this.localStorageKey, this.state, this.schema);
				if (!result.success) {
					console.error('Error validating or storing data:', result.error);
				}
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): T {
		const parsedData: T = getLocalStorage(this.localStorageKey);
		return parsedData;
	}

	public static getInstance<T>(...args: (string | number | z.ZodSchema<T>)[]): Store<T> {
		// Extract schema if provided as last argument
		let schema: z.ZodSchema<T> | undefined;
		if (args.length && args[args.length - 1] instanceof z.ZodSchema) {
			schema = args.pop() as z.ZodSchema<T>;
		}

		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new this<T>(storageKey, schema);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as Store<T>;
	}
}
