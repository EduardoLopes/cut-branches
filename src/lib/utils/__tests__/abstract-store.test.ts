import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { AbstractStore } from '../abstract-store.svelte';
import * as getLocalStorageModule from '../get-local-storage';
import * as setValidatedLocalStorageModule from '../set-validated-local-storage';

// Create a concrete implementation of AbstractStore for testing
class TestStore<T> extends AbstractStore<T, Set<T>> {
	protected itemSchema: z.ZodSchema<T[]>;

	constructor(key?: string, itemSchema?: z.ZodSchema<T>) {
		super(key);
		this.itemSchema = z.array(itemSchema || z.any());
	}

	add(item: T) {
		this.state.add(item);
		this.updateStorage();
	}

	protected getAsList(): T[] {
		return Array.from(this.state);
	}

	protected getStorableData(): T[] {
		return [...this.state];
	}

	protected getDataSchema(): z.ZodSchema<T[]> {
		return this.itemSchema;
	}

	protected createCollection(data: unknown): Set<T> {
		return new Set(data as T[]);
	}

	protected doClear(): void {
		this.state.clear();
	}

	// Add default value methods
	getDefaultValue(): unknown {
		return [];
	}

	static getInstance<T>(...keyParts: (string | number)[]): TestStore<T> {
		return AbstractStore.getCommonInstance(
			TestStore as unknown as new (key: string, ...args: unknown[]) => TestStore<T>,
			[],
			keyParts
		);
	}
}

// Mock the storage modules
vi.mock('../get-local-storage', () => ({
	getLocalStorage: vi.fn()
}));

vi.mock('../set-validated-local-storage', () => ({
	setValidatedLocalStorage: vi.fn()
}));

describe('AbstractStore', () => {
	const testKey = 'test-store';
	const testData = ['item1', 'item2', 'item3'];

	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();

		// Mock getLocalStorage to return test data
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(testData);

		// Mock setValidatedLocalStorage to return success
		vi.mocked(setValidatedLocalStorageModule.setValidatedLocalStorage).mockReturnValue({
			success: true,
			data: testData
		});

		// Clear any stored instances
		// @ts-expect-error - accessing private static property for testing
		AbstractStore.instances = {};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with data from localStorage', () => {
		const store = new TestStore<string>(testKey);

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith(`store_${testKey}`, []);
		expect(Array.from(store.state)).toEqual(testData);
		expect(store.list).toEqual(testData);
	});

	it('should update localStorage when adding items', () => {
		const store = new TestStore<string>(testKey);
		const newItem = 'item4';

		store.add(newItem);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			[...testData, newItem],
			expect.any(Object)
		);
	});

	it('should clear all items', () => {
		const store = new TestStore<string>(testKey);

		store.clear();

		expect(store.state.size).toBe(0);
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			[],
			expect.any(Object)
		);
	});

	it('should update from localStorage', () => {
		const store = new TestStore<string>(testKey);
		const newData = ['updated1', 'updated2'];

		// Change the mock return value
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(newData);

		store.updateFromLocalStorage();

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith(`store_${testKey}`, []);
		expect(Array.from(store.state)).toEqual(newData);
	});

	it('should maintain singleton instances using getCommonInstance', () => {
		// @ts-expect-error - accessing static method for testing with the concrete TestStore
		const store1 = AbstractStore.getCommonInstance(TestStore, [], ['singleton-test']);
		// @ts-expect-error - accessing static method for testing with the concrete TestStore
		const store2 = AbstractStore.getCommonInstance(TestStore, [], ['singleton-test']);

		expect(store1).toBe(store2); // Same instance should be returned
	});

	it('should handle localStorage errors gracefully', () => {
		// Mock console.error
		const originalConsoleError = console.error;
		console.error = vi.fn();

		// Mock storage error
		vi.mocked(setValidatedLocalStorageModule.setValidatedLocalStorage).mockReturnValue({
			success: false,
			error: new Error('Storage error')
		});

		const store = new TestStore<string>(testKey);
		store.add('new-item');

		expect(console.error).toHaveBeenCalled();

		// Restore console.error
		console.error = originalConsoleError;
	});

	it('should use default key if no key parts provided', () => {
		// @ts-expect-error - accessing static method for testing with the concrete TestStore
		const _store = AbstractStore.getCommonInstance(TestStore, []);

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith('store_teststore', []);
	});
});
