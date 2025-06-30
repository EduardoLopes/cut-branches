import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import { AbstractStore } from '../abstract-store.svelte';
import * as getValidatedLocalStorageModule from '../get-validated-local-storage';
import * as setValidatedLocalStorageModule from '../set-validated-local-storage';
import { Store } from '../store.svelte';

// Mock storage modules
vi.mock('../get-validated-local-storage', () => ({
	getValidatedLocalStorage: vi.fn()
}));

vi.mock('../set-validated-local-storage', () => ({
	setValidatedLocalStorage: vi.fn()
}));

describe('Store', () => {
	const testKey = 'test-store';
	const testData = 'test-value';
	const stringSchema = z.string();

	beforeEach(() => {
		// Reset mocks
		vi.resetAllMocks();

		// Mock getValidatedLocalStorage to return test data
		vi.mocked(getValidatedLocalStorageModule.getValidatedLocalStorage).mockReturnValue({
			success: true,
			data: testData
		});

		// Mock setValidatedLocalStorage to return success
		vi.mocked(setValidatedLocalStorageModule.setValidatedLocalStorage).mockReturnValue({
			success: true,
			data: testData
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with data from localStorage', () => {
		const store = new Store<string>(testKey, stringSchema);

		expect(getValidatedLocalStorageModule.getValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.any(Object),
			undefined
		);
		expect(store.state).toEqual(testData);
		expect(store.get()).toEqual(testData);
		expect(store.list).toEqual([testData]);
	});

	it('should set values and update localStorage', () => {
		const store = new Store<string>(testKey, stringSchema);
		const newValue = 'updated-value';

		store.set(newValue);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			newValue,
			expect.any(Object)
		);
		expect(store.get()).toBe(newValue);
	});

	it('should clear the value', () => {
		const store = new Store<string>(testKey, stringSchema);

		store.clear();

		expect(store.get()).toBeUndefined();
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			undefined,
			expect.any(Object)
		);
	});

	it('should update from localStorage', () => {
		const store = new Store<string>(testKey, stringSchema);
		const newData = 'updated-value';

		// Change the mock return value
		vi.mocked(getValidatedLocalStorageModule.getValidatedLocalStorage).mockReturnValue({
			success: true,
			data: newData
		});

		store.updateFromLocalStorage();

		expect(getValidatedLocalStorageModule.getValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.any(Object),
			undefined
		);
		expect(store.get()).toEqual(newData);
	});

	it('should use schema validation when provided', () => {
		const numberSchema = z.number();

		vi.mocked(getValidatedLocalStorageModule.getValidatedLocalStorage).mockReturnValue({
			success: true,
			data: 123
		});

		const store = new Store<number>(testKey, numberSchema);

		store.set(456);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			456,
			expect.any(Object)
		);
	});

	it('should maintain singleton instances using getInstance', () => {
		const store1 = Store.getInstance<string>([testKey], stringSchema);
		const store2 = Store.getInstance<string>([testKey], stringSchema);

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
			expect.any(Object)
		);
	});

	it('should handle undefined values', () => {
		vi.mocked(getValidatedLocalStorageModule.getValidatedLocalStorage).mockReturnValue({
			success: false,
			error: new Error('Test error: No data found')
		});

		const store = new Store<string>(testKey, stringSchema);

		expect(store.get()).toBeUndefined();
		expect(store.list).toEqual([]);
	});
});
