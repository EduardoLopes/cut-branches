import { untrack } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
import { z } from 'zod';
import { setValidatedLocalStorage } from './set-validated-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class SetStore<T> {
	private static instances: { [key: string]: SetStore<unknown> } = {};
	private itemSchema: z.ZodSchema<T>;
	private arraySchema: z.ZodSchema<T[]>;

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = this.#getLocalStorage();

	list = $derived(Array.from(this.state));

	constructor(key?: string, itemSchema?: z.ZodSchema<T>) {
		this.#key = key;
		// Default schema allows any data type if not provided
		this.itemSchema = itemSchema || (z.any() as z.ZodSchema<T>);
		// Create a schema for the array of items
		this.arraySchema = z.array(this.itemSchema);

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
				const items = [...this.state];
				const result = setValidatedLocalStorage(this.localStorageKey, items, this.arraySchema);
				if (!result.success) {
					console.error('Error validating or storing set data:', result.error);
				}
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): SvelteSet<T> {
		const parsedData: T[] = getLocalStorage(this.localStorageKey, []);
		return new SvelteSet(parsedData);
	}

	public static getInstance<T>(...args: (string | number | z.ZodSchema<T>)[]): SetStore<T> {
		// Extract schema if provided as last argument
		let itemSchema: z.ZodSchema<T> | undefined;
		if (args.length && args[args.length - 1] instanceof z.ZodSchema) {
			itemSchema = args.pop() as z.ZodSchema<T>;
		}

		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new SetStore<T>(storageKey, itemSchema);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as SetStore<T>;
	}
}
