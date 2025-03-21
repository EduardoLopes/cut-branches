import { untrack } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import { setValidatedLocalStorage } from './set-validated-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export class MapStore<K, V> {
	private static instances: { [key: string]: MapStore<unknown, unknown> } = {};
	private keySchema: z.ZodSchema<K>;
	private valueSchema: z.ZodSchema<V>;
	private entriesSchema: z.ZodSchema<[K, V][]>;

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}
	state = this.#getLocalStorage();

	list = $derived<V[]>(Array.from(this.state.values()));

	constructor(key?: string, keySchema?: z.ZodSchema<K>, valueSchema?: z.ZodSchema<V>) {
		this.#key = key;
		// Default schemas allow any data type if not provided
		this.keySchema = keySchema || (z.any() as z.ZodSchema<K>);
		this.valueSchema = valueSchema || (z.any() as z.ZodSchema<V>);
		// Create a schema for the array of entries
		this.entriesSchema = z.array(z.tuple([this.keySchema, this.valueSchema]));

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
				const entries = [...this.state.entries()];
				const result = setValidatedLocalStorage(this.localStorageKey, entries, this.entriesSchema);
				if (!result.success) {
					console.error('Error validating or storing map data:', result.error);
				}
			} catch (error) {
				console.error('Error setting localStorage data:', error);
			}
		}
	}

	#getLocalStorage(): SvelteMap<K, V> {
		const parsedData: [K, V][] = getLocalStorage(this.localStorageKey, []);
		return new SvelteMap(parsedData);
	}

	public static getInstance<K, V>(
		...args: (string | number | z.ZodSchema<K> | z.ZodSchema<V>)[]
	): MapStore<K, V> {
		// Extract schemas if provided
		let keySchema: z.ZodSchema<K> | undefined;
		let valueSchema: z.ZodSchema<V> | undefined;

		// Check for schemas in the last two arguments
		if (
			args.length >= 2 &&
			args[args.length - 2] instanceof z.ZodSchema &&
			args[args.length - 1] instanceof z.ZodSchema
		) {
			valueSchema = args.pop() as z.ZodSchema<V>;
			keySchema = args.pop() as z.ZodSchema<K>;
		}

		const storageKey = args.join('_');
		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new MapStore<K, V>(storageKey, keySchema, valueSchema);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as MapStore<K, V>;
	}
}
