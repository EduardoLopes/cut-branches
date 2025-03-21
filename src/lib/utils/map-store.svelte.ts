import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import { AbstractStore } from './abstract-store.svelte';

export class MapStore<K, V> extends AbstractStore<V, SvelteMap<K, V>> {
	private keySchema: z.ZodSchema<K>;
	private valueSchema: z.ZodSchema<V>;
	private entriesSchema: z.ZodSchema<[K, V][]>;

	constructor(key: string, keySchema: z.ZodSchema<K>, valueSchema: z.ZodSchema<V>) {
		super(key, z.array(z.tuple([keySchema, valueSchema])));
		this.keySchema = keySchema;
		this.valueSchema = valueSchema;
		// Create a schema for the array of entries
		this.entriesSchema = z.array(z.tuple([this.keySchema, this.valueSchema]));

		// Ensure singleton behavior by registering instance
		const instanceKey = `map_store_${key}`;
		if (!AbstractStore.instances[instanceKey]) {
			AbstractStore.instances[instanceKey] = this;
		} else {
			return AbstractStore.instances[instanceKey] as unknown as MapStore<K, V>;
		}
	}

	set(key: K, value: V) {
		// Validate key and value against schemas
		this.keySchema.parse(key);
		this.valueSchema.parse(value);

		this.state.set(key, value);
		this.updateStorage();
	}

	delete(keys: K[]) {
		keys.forEach((key) => this.state.delete(key));
		this.updateStorage();
	}

	has(key: K): boolean {
		return this.state.has(key);
	}

	get(key: K): V | undefined {
		return this.state.get(key);
	}

	protected getAsList(): V[] {
		return Array.from(this.state.values());
	}

	protected getStorableData(): [K, V][] {
		return [...this.state.entries()];
	}

	protected getDataSchema(): z.ZodSchema<[K, V][]> {
		return this.entriesSchema;
	}

	protected createCollection(data: unknown): SvelteMap<K, V> {
		return new SvelteMap(data as [K, V][]);
	}

	protected doClear(): void {
		this.state.clear();
	}

	protected getDefaultValue(): unknown {
		return [];
	}

	public static getInstance<K, V>(
		key: string | number | (string | number)[],
		keySchema: z.ZodSchema<K>,
		valueSchema: z.ZodSchema<V>
	): MapStore<K, V> {
		const keyParts = Array.isArray(key) ? key : [key];
		const schemaArgs = [keySchema, valueSchema];

		return AbstractStore.getCommonInstance(
			MapStore as unknown as new (key: string, ...args: unknown[]) => MapStore<K, V>,
			schemaArgs,
			keyParts
		) as MapStore<K, V>;
	}
}
