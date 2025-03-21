import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { AbstractStore } from '../abstract-store.svelte';
import * as getLocalStorageModule from '../get-local-storage';
import { SetStore } from '../set-store.svelte';
import * as setValidatedLocalStorageModule from '../set-validated-local-storage';

// Mock the storage modules
vi.mock('../get-local-storage', () => ({
	getLocalStorage: vi.fn()
}));

vi.mock('../set-validated-local-storage', () => ({
	setValidatedLocalStorage: vi.fn()
}));

describe('SetStore', () => {
	const testKey = 'test-set-store';
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
		const store = new SetStore<string>(testKey);

		expect(getLocalStorageModule.getLocalStorage).toHaveBeenCalledWith(`store_${testKey}`, []);
		expect(store.has('item1')).toBe(true);
		expect(store.has('item2')).toBe(true);
		expect(store.has('item3')).toBe(true);
		expect(store.list).toEqual(expect.arrayContaining(testData));
		expect(store.list.length).toBe(3);
	});

	it('should add items and update localStorage', () => {
		const store = new SetStore<string>(testKey);
		const newItems = ['item4', 'item5'];

		store.add(newItems);

		// Create expected data with the new items
		const expectedData = [...testData, ...newItems];

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.arrayContaining(expectedData),
			expect.any(Object)
		);
		expect(store.has('item4')).toBe(true);
		expect(store.has('item5')).toBe(true);
	});

	it('should delete items and update localStorage', () => {
		const store = new SetStore<string>(testKey);

		store.delete(['item1']);

		expect(store.has('item1')).toBe(false);
		expect(store.has('item2')).toBe(true);
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalled();
	});

	it('should check if an item exists', () => {
		const store = new SetStore<string>(testKey);

		expect(store.has('item1')).toBe(true);
		expect(store.has('nonexistent')).toBe(false);
	});

	it('should clear all items', () => {
		const store = new SetStore<string>(testKey);

		store.clear();

		expect(store.has('item1')).toBe(false);
		expect(store.list).toEqual([]);
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			[],
			expect.any(Object)
		);
	});

	it('should use schema validation when provided', () => {
		const numberSchema = z.number();

		vi.mocked(getLocalStorageModule.getLocalStorage).mockReturnValue([1, 2, 3]);

		const store = new SetStore<number>(testKey, numberSchema);

		store.add([4, 5]);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.arrayContaining([4, 5]),
			expect.any(Object)
		);
	});

	it('should maintain singleton instances using getInstance', () => {
		const store1 = SetStore.getInstance<string>(testKey);
		const store2 = SetStore.getInstance<string>(testKey);

		expect(store1).toBe(store2); // Same instance should be returned
	});

	it('should extract schema from getInstance arguments', () => {
		const itemSchema = z.string();

		// Mock implementation to verify schemas are correctly passed
		// @ts-expect-error - mocking static method for testing
		vi.spyOn(AbstractStore, 'getCommonInstance').mockImplementation((_ctor, args) => {
			// Just return args for verification
			return args;
		});

		const result = SetStore.getInstance<string>('test', itemSchema);

		// Check that schema was correctly extracted and passed to getCommonInstance
		expect(result).toEqual([itemSchema]);
	});
});
