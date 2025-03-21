import { SvelteMap } from 'svelte/reactivity';
import { z } from 'zod';
import { AbstractStore } from './abstract-store.svelte';

export class MapStore<K, V> extends AbstractStore<V, SvelteMap<K, V>> {
	private keySchema: z.ZodSchema<K>;
	private valueSchema: z.ZodSchema<V>;
	private entriesSchema: z.ZodSchema<[K, V][]>;

	constructor(key?: string, keySchema?: z.ZodSchema<K>, valueSchema?: z.ZodSchema<V>) {
		super(key);
		// Default schemas allow any data type if not provided
		this.keySchema = keySchema || (z.any() as z.ZodSchema<K>);
		this.valueSchema = valueSchema || (z.any() as z.ZodSchema<V>);
		// Create a schema for the array of entries
		this.entriesSchema = z.array(z.tuple([this.keySchema, this.valueSchema]));
	}

	set(key: K, value: V) {
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
		return {};
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

		const schemaArgs = [keySchema, valueSchema].filter(Boolean);
		const keyParts = args.filter((arg) => typeof arg === 'string' || typeof arg === 'number') as (
			| string
			| number
		)[];

		return AbstractStore.getCommonInstance(
			MapStore as unknown as new (key: string, ...args: unknown[]) => MapStore<K, V>,
			schemaArgs,
			keyParts
		) as MapStore<K, V>;
	}
}
