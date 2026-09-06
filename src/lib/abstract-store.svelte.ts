import { untrack } from 'svelte';
import { z } from 'zod/v4';
import { getValidatedLocalStorage } from '$utils/get-validated-local-storage';
import { setValidatedLocalStorage } from '$utils/set-validated-local-storage';

/**
 * Bumped once for every store instance that gets created.
 *
 * Store singletons are reached lazily, usually from inside a `$derived` (e.g.
 * `isFeatureEnabled()` in a component). A `$state` source created while a
 * reaction is running is excluded from that run's dependencies, so the very
 * first reader of a brand-new store never subscribes to it and would keep
 * showing the initial value until a reload. Every reader also depends on this
 * module-level counter — created at import time, so it is always trackable —
 * and creating an instance schedules a bump, which makes that first reader run
 * again and pick up the store's real source.
 */
let registryVersion = $state(0);

export abstract class AbstractStore<T, C> {
	protected static instances: Record<string, AbstractStore<unknown, unknown>> = {};

	#key: string;
	get localStorageKey() {
		return `store_${this.#key}`;
	}

	state = $state<C | undefined>(undefined);
	list = $derived(this.getAsList());

	constructor(
		key: string,
		protected schema: z.ZodType<unknown>,
		protected defaultValue?: unknown
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
		if (typeof window !== 'undefined') {
			try {
				const data = this.getStorableData();

				// If data is undefined (cleared state), remove from localStorage directly
				if (data === undefined) {
					localStorage.removeItem(this.localStorageKey);
					return;
				}

				const dataSchema = this.getDataSchema() || this.schema;
				const result = setValidatedLocalStorage(this.localStorageKey, data, dataSchema);
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
		const dataSchema = this.getDataSchema() || this.schema;
		const result = getValidatedLocalStorage(this.localStorageKey, dataSchema, defaultValue);

		if (!result.success) {
			console.error(
				`Error validating localStorage data for ${this.constructor.name}:`,
				result.error
			);
			return this.createCollection(defaultValue);
		}

		return this.createCollection(result.data);
	}

	protected updateStorage() {
		this.#updateLocalStorage();
	}

	protected abstract getAsList(): T[];
	protected abstract getStorableData(): unknown;
	protected abstract getDataSchema(): z.ZodType<unknown>;
	protected abstract createCollection(data: unknown): C;
	protected abstract doClear(): void;
	protected getDefaultValue(): unknown {
		return this.defaultValue;
	}

	protected static getCommonInstance<S extends AbstractStore<T, C>, T, C>(
		ctor: new (key: string, ...constructorArgs: unknown[]) => S,
		args: unknown[],
		keyParts: (string | number)[] = [],
		defaultValue?: unknown
	): S {
		// Extract the storage key from the provided key parts
		const storageKey = keyParts.length ? keyParts.join('_') : this.getDefaultKey(ctor);

		if (!storageKey) {
			throw new Error('a storage_key name must be provided');
		}

		// Check that at least one schema was provided
		if (!args.length) {
			throw new Error('a schema must be provided');
		}

		// Subscribe the caller to instance creation before the lookup — see
		// `registryVersion`.
		void registryVersion;

		if (!this.instances[storageKey]) {
			untrack(() => {
				this.instances[storageKey] = new ctor(storageKey, ...args, defaultValue);
				this.instances[storageKey].updateFromLocalStorage();
			});

			// Not synchronous: we may well be inside a `$derived`, where writing to
			// state throws.
			queueMicrotask(() => {
				registryVersion += 1;
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
