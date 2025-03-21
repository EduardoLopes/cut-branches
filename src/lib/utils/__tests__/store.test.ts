import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { AbstractStore } from '../abstract-store.svelte';
import * as getLocalStorageModule from '../get-local-storage';
import * as setValidatedLocalStorageModule from '../set-validated-local-storage';
import { Store } from '../store.svelte';

// Mock the storage modules
vi.mock('../get-local-storage', () => ({
	getLocalStorage: vi.fn()
}));

vi.mock('../set-validated-local-storage', () => ({
	setValidatedLocalStorage: vi.fn()
}));

describe('Store', () => {
	const testKey = 'test-store';
	const testData = 'test-value';

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
		const store = new Store<string>(testKey);

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			undefined
		);
		expect(store.state).toEqual(testData);
		expect(store.get()).toEqual(testData);
		expect(store.list).toEqual([testData]);
	});

	it('should set value and update localStorage', () => {
		const store = new Store<string>(testKey);
		const newValue = 'new-value';

		store.set(newValue);

		// Note: We now expect the schema to be a ZodAny instance
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			newValue,
			expect.any(Object)
		);
		expect(store.get()).toBe(newValue);
	});

	it('should clear value', () => {
		const store = new Store<string>(testKey);

		store.clear();

		expect(store.get()).toBeUndefined();
		expect(store.list).toEqual([]);
		// Note: We now expect the schema to be a ZodAny instance
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			undefined,
			expect.any(Object)
		);
	});

	it('should update from localStorage', () => {
		const store = new Store<string>(testKey);
		const newData = 'updated-value';

		// Change the mock return value
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(newData);

		store.updateFromLocalStorage();

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			undefined
		);
		expect(store.get()).toEqual(newData);
	});

	it('should use schema validation when provided', () => {
		const numberSchema = z.number();

		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(123);

		const store = new Store<number>(testKey, numberSchema);

		store.set(456);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			456,
			numberSchema
		);
	});

	it('should maintain singleton instances using getInstance', () => {
		const store1 = Store.getInstance<string>([testKey]);
		const store2 = Store.getInstance<string>([testKey]);

		expect(store1).toBe(store2); // Same instance should be returned
	});

	it('should pass schema to getInstance', () => {
		const schema = z.string();

		// Mock implementation to verify schemas are correctly passed
		// @ts-expect-error - mocking static method for testing
		vi.spyOn(AbstractStore, 'getCommonInstance').mockImplementation((_ctor, args) => {
			// Just return args for verification
			return new Store(testKey, args[0]);
		});

		const store = Store.getInstance<string>([testKey], schema);
		expect(store).toBeInstanceOf(Store);

		// Set value to check that schema is being used
		store.set('test');
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			'test',
			schema
		);
	});

	it('should handle undefined values', () => {
		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue(undefined);

		const store = new Store<string>(testKey);

		expect(store.get()).toBeUndefined();
		expect(store.list).toEqual([]);
	});
});
