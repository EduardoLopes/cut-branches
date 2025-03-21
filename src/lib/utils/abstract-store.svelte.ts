import { untrack } from 'svelte';
import { z } from 'zod';
import { setValidatedLocalStorage } from './set-validated-local-storage';
import { getLocalStorage } from '$lib/utils/get-local-storage';

export abstract class AbstractStore<T, C> {
	protected static instances: { [key: string]: AbstractStore<unknown, unknown> } = {};

	#key: string | undefined = undefined;
	get localStorageKey() {
		return `store_${this.#key}`;
	}

	state: C;
	list = $derived(this.getAsList());

	constructor(
		key?: string,
		protected schema?: z.ZodSchema<unknown>
	) {
		this.#key = key;
		this.state = this.#getLocalStorage();
		this.updateFromLocalStorage();
	}

	updateFromLocalStorage() {
		this.state = this.#getLocalStorage();
	}

	clear() {
		this.doClear();
		this.#updateLocalStorage();
	}

	#updateLocalStorage() {
		if (typeof window !== 'undefined' && this.#key) {
			try {
				const data = this.getStorableData();
				const result = setValidatedLocalStorage(this.localStorageKey, data, this.getDataSchema());
				if (!result.success) {
					console.error(`Error validating or storing ${this.constructor.name} data:`, result.error);
				}
			} catch (error) {
				console.error(`Error setting localStorage data for ${this.constructor.name}:`, error);
			}
		}
	}

	#getLocalStorage(): C {
		const defaultValue = this.getDefaultValue();
		const data = getLocalStorage(this.localStorageKey, defaultValue);
		return this.createCollection(data);
	}

	protected updateStorage() {
		this.#updateLocalStorage();
	}

	protected abstract getAsList(): T[];
	protected abstract getStorableData(): unknown;
	protected abstract getDataSchema(): z.ZodSchema<unknown>;
	protected abstract createCollection(data: unknown): C;
	protected abstract doClear(): void;
	protected abstract getDefaultValue(): unknown;

	protected static getCommonInstance<S extends AbstractStore<unknown, unknown>>(
		ctor: new (key: string, ...constructorArgs: unknown[]) => S,
		args: unknown[],
		keyParts: (string | number)[] = []
	): S {
		// Extract the storage key from the provided key parts
		const storageKey = keyParts.length ? keyParts.join('_') : this.getDefaultKey(ctor);

		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		if (!this.instances[storageKey]) {
			this.instances[storageKey] = new ctor(storageKey, ...args);
			untrack(() => {
				this.instances[storageKey].updateFromLocalStorage();
			});
		}

		return this.instances[storageKey] as S;
	}

	private static getDefaultKey<S extends AbstractStore<unknown, unknown>>(
		ctor: new (key: string, ...args: unknown[]) => S
	): string {
		return ctor.name.toLowerCase();
	}
}
