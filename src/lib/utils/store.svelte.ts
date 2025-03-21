import { z } from 'zod';
import { AbstractStore } from './abstract-store.svelte';

export class Store<T = unknown> extends AbstractStore<T, T | undefined> {
	private valueSchema: z.ZodSchema<T>;

	constructor(key: string, schema: z.ZodSchema<T>) {
		super(key, schema);
		this.valueSchema = schema;
	}

	get() {
		return this.state;
	}

	set(val: T) {
		this.state = val;
		this.updateStorage();
	}

	doClear(): void {
		this.state = undefined;
	}

	getStorableData() {
		return this.state;
	}

	getDataSchema(): z.ZodSchema<unknown> {
		return this.valueSchema;
	}

	createCollection(data: unknown): T | undefined {
		return data as T;
	}

	protected getAsList(): T[] {
		return this.state !== undefined ? [this.state] : [];
	}

	protected getDefaultValue(): unknown {
		return undefined;
	}

	static getInstance<T>(
		key: string | number | (string | number)[],
		schema: z.ZodSchema<T>
	): Store<T> {
		const keyParts = key ? (Array.isArray(key) ? key : [key]) : [];
		const args = [schema];

		return AbstractStore.getCommonInstance(
			Store as unknown as new (key: string, ...constructorArgs: unknown[]) => Store<T>,
			args,
			keyParts
		);
	}
}
