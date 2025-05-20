import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod/v4';
import { AbstractStore } from './abstract-store.svelte';

export class MapStore<K, V> extends AbstractStore<V, SvelteMap<K, V>> {
	private keySchema!: z.ZodType<K>;
	private valueSchema!: z.ZodType<V>;
	private entriesSchema!: z.ZodType<[K, V][]>;

	constructor(
		key: string,
		keySchema: z.ZodType<K>,
		valueSchema: z.ZodType<V>,
		defaultValue: unknown = []
	) {
		// Create a schema for the array of entries
		const entriesSchema = z.array(z.tuple([keySchema, valueSchema]));

		// Check if an instance with this key already exists
		const instanceKey = `map_store_${key}`;
		if (AbstractStore.instances[instanceKey]) {
			return AbstractStore.instances[instanceKey] as MapStore<K, V>;
		}

		super(key, entriesSchema, defaultValue);

		this.keySchema = keySchema;
		this.valueSchema = valueSchema;
		this.entriesSchema = entriesSchema;

		// Register this instance
		AbstractStore.instances[instanceKey] = this;
	}

	set(key: K, value: V) {
		// Validate key and value against schemas
		this.keySchema.parse(key);
		this.valueSchema.parse(value);

		this.state?.set(key, value);
		this.updateStorage();
	}

	delete(keys: K[]) {
		keys.forEach((key) => this.state?.delete(key));
		this.updateStorage();
	}

	has(key: K): boolean {
		return this.state?.has(key) ?? false;
	}

	get(key: K): V | undefined {
		return this.state?.get(key);
	}

	protected getAsList(): V[] {
		return Array.from(this.state?.values() ?? []);
	}

	protected getStorableData(): [K, V][] {
		return [...(this.state?.entries() ?? [])];
	}

	protected getDataSchema(): z.ZodType<[K, V][]> {
		return this.entriesSchema;
	}

	protected createCollection(data: [K, V][]): SvelteMap<K, V> {
		return new SvelteMap(data);
	}

	protected doClear(): void {
		this.state?.clear();
	}

	public static getInstance<K, V>(
		key: string | number | (string | number)[],
		keySchema: z.ZodType<K>,
		valueSchema: z.ZodType<V>,
		defaultValue: unknown = []
	): MapStore<K, V> {
		const keyParts = Array.isArray(key) ? key : [key];
		const schemaArgs = [keySchema, valueSchema];

		return AbstractStore.getCommonInstance<MapStore<K, V>, V, SvelteMap<K, V>>(
			MapStore as new (key: string, ...args: unknown[]) => MapStore<K, V>,
			schemaArgs,
			keyParts,
			defaultValue
		);
	}
}
