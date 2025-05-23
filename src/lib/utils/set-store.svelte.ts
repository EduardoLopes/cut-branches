import { SvelteSet } from 'svelte/reactivity';
import { z } from 'zod/v4';
import { AbstractStore } from './abstract-store.svelte';

export class SetStore<T> extends AbstractStore<T, SvelteSet<T>> {
	private itemSchema: z.ZodType<T>;
	private arraySchema: z.ZodType<T[]>;

	constructor(key: string, itemSchema: z.ZodType<T>, defaultValue: unknown = []) {
		// For SetStore, we need to use the array schema as the primary schema for validation
		const arraySchema = z.array(itemSchema);
		super(key, arraySchema, defaultValue);

		this.itemSchema = itemSchema;
		this.arraySchema = arraySchema;
	}

	add(items: T[]) {
		items.forEach((item) => this.state?.add(item));
		this.updateStorage();
	}

	delete(items: T[]) {
		items.forEach((item) => this.state?.delete(item));
		this.updateStorage();
	}

	has(item: T): boolean {
		return this.state?.has(item) ?? false;
	}

	protected getAsList(): T[] {
		return Array.from(this.state ?? []);
	}

	protected getStorableData(): T[] {
		return [...(this.state ?? [])];
	}

	protected getDataSchema(): z.ZodType<T[]> {
		return this.arraySchema;
	}

	protected createCollection(data: T[]): SvelteSet<T> {
		return new SvelteSet(data);
	}

	protected doClear(): void {
		this.state?.clear();
	}

	public static getInstance<T>(
		key: string | number | (string | number)[],
		itemSchema: z.ZodType<T>,
		defaultValue: unknown = []
	): SetStore<T> {
		const keyParts = Array.isArray(key) ? key : [key];
		const schemaArgs = [itemSchema];

		return AbstractStore.getCommonInstance(
			SetStore as new (key: string, ...args: unknown[]) => SetStore<T>,
			schemaArgs,
			keyParts,
			defaultValue
		) as SetStore<T>;
	}
}
