import { mergeDeepRight } from 'ramda';
import { z } from 'zod/v4';
import { AbstractStore } from './abstract-store.svelte';
/**
 * A reactive store that can be used with Svelte 4 or Svelte 5.
 * In Svelte 5, it can be used with the new reactivity system.
 */
export class Store<T = unknown> extends AbstractStore<T, T | undefined> {
	private valueSchema: z.ZodType<T>;

	constructor(key: string, schema: z.ZodType<T>, defaultValue?: unknown) {
		super(key, schema, defaultValue !== undefined ? defaultValue : undefined);
		this.valueSchema = schema;
	}

	/**
	 * Get the current state value
	 */
	get() {
		return this.state;
	}

	/**
	 * Set a new state value and update storage
	 * @param val - The new value
	 */
	set(val: T) {
		this.state = val;
		this.updateStorage();
	}

	/**
	 * Update part of the state (for objects only)
	 * @param partialState - Partial state to merge (performs deep merge for nested objects)
	 */
	update(partialState: Partial<T>) {
		if (typeof this.state === 'object' && this.state !== null) {
			this.state = mergeDeepRight(
				this.state as unknown as Record<string, unknown>,
				partialState as unknown as Record<string, unknown>
			) as T;
			this.updateStorage();
		} else {
			console.warn('Cannot update non-object state, use set() instead');
		}
	}

	/**
	 * Clear state and storage
	 */
	doClear(): void {
		this.state = undefined;
	}

	getStorableData() {
		return this.state;
	}

	getDataSchema(): z.ZodType<unknown> {
		return this.valueSchema;
	}

	createCollection(data: unknown): T | undefined {
		return data as T;
	}

	protected getAsList(): T[] {
		return this.state !== undefined ? [this.state] : [];
	}

	/**
	 * Get a singleton instance of the store
	 * @param key - Storage key
	 * @param schema - Zod schema
	 * @param defaultValue - Default value
	 */
	static getInstance<T>(
		key: string | number | (string | number)[],
		schema: z.ZodType<T>,
		defaultValue?: unknown
	): Store<T> {
		const keyParts = key ? (Array.isArray(key) ? key : [key]) : [];
		const args = [schema];

		return AbstractStore.getCommonInstance(
			Store as unknown as new (key: string, ...constructorArgs: unknown[]) => Store<T>,
			args,
			keyParts,
			defaultValue
		);
	}

	/**
	 * Create a derived value from the store that works with Svelte 5 reactivity
	 * @param selector - Function to select a value from the state
	 */
	derive<U>(selector: (state: T | undefined) => U): () => U {
		return () => selector(this.state);
	}
}
