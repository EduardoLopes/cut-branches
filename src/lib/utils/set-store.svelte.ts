import { SvelteSet } from 'svelte/reactivity';
import { z } from 'zod';
import { AbstractStore } from './abstract-store.svelte';

export class SetStore<T> extends AbstractStore<T, SvelteSet<T>> {
	private itemSchema: z.ZodSchema<T>;
	private arraySchema: z.ZodSchema<T[]>;

	constructor(key?: string, itemSchema?: z.ZodSchema<T>) {
		super(key);
		// Default schema allows any data type if not provided
		this.itemSchema = itemSchema || (z.any() as z.ZodSchema<T>);
		// Create a schema for the array of items
		this.arraySchema = z.array(this.itemSchema);
	}

	add(items: T[]) {
		items.forEach((item) => this.state.add(item));
		this.updateStorage();
	}

	delete(items: T[]) {
		items.forEach((item) => this.state.delete(item));
		this.updateStorage();
	}

	has(item: T): boolean {
		return this.state.has(item);
	}

	protected getAsList(): T[] {
		return Array.from(this.state);
	}

	protected getStorableData(): T[] {
		return [...this.state];
	}

	protected getDataSchema(): z.ZodSchema<T[]> {
		return this.arraySchema;
	}

	protected createCollection(data: unknown): SvelteSet<T> {
		return new SvelteSet(data as T[]);
	}

	protected doClear(): void {
		this.state.clear();
	}

	protected getDefaultValue(): unknown {
		return [];
	}

	public static getInstance<T>(...args: (string | number | z.ZodSchema<T>)[]): SetStore<T> {
		// Extract schema if provided as last argument
		let itemSchema: z.ZodSchema<T> | undefined;
		if (args.length && args[args.length - 1] instanceof z.ZodSchema) {
			itemSchema = args.pop() as z.ZodSchema<T>;
		}

		const schemaArgs = itemSchema ? [itemSchema] : [];
		const keyParts = args.filter((arg) => typeof arg === 'string' || typeof arg === 'number') as (
			| string
			| number
		)[];

		return AbstractStore.getCommonInstance(
			SetStore as unknown as new (key: string, ...args: unknown[]) => SetStore<T>,
			schemaArgs,
			keyParts
		) as SetStore<T>;
	}
}
