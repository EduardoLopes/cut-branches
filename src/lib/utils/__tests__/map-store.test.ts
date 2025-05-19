import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod/v4';
import { AbstractStore } from '../abstract-store.svelte';
import * as getValidatedLocalStorageModule from '../get-validated-local-storage';
import { MapStore } from '../map-store.svelte';
import * as setValidatedLocalStorageModule from '../set-validated-local-storage';

// Mock the storage modules
vi.mock('../get-validated-local-storage', () => ({
	getValidatedLocalStorage: vi.fn()
}));

vi.mock('../set-validated-local-storage', () => ({
	setValidatedLocalStorage: vi.fn()
}));

describe('MapStore', () => {
	const testKey = 'test-map-store';
	const testData: [string, string][] = [
		['key1', 'value1'],
		['key2', 'value2'],
		['key3', 'value3']
	];
	const stringKeySchema = z.string();
	const stringValueSchema = z.string();

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

		// Clear any stored instances
		// @ts-expect-error - accessing private static property for testing
		AbstractStore.instances = {};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should initialize with data from localStorage', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		expect(getValidatedLocalStorageModule.getValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.any(Object),
			[]
		);
		expect(store.get('key1')).toBe('value1');
		expect(store.get('key2')).toBe('value2');
		expect(store.get('key3')).toBe('value3');
		expect(store.list).toEqual(['value1', 'value2', 'value3']);
	});

	it('should set values and update localStorage', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);
		const newKey = 'key4';
		const newValue = 'value4';

		store.set(newKey, newValue);
		const expectedData = [...testData, [newKey, newValue]];

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.arrayContaining(expectedData),
			expect.any(Object)
		);
		expect(store.get(newKey)).toBe(newValue);
	});

	it('should delete values and update localStorage', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		store.delete(['key1']);

		expect(store.has('key1')).toBe(false);
		expect(store.has('key2')).toBe(true);
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalled();
	});

	it('should check if a key exists', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		expect(store.has('key1')).toBe(true);
		expect(store.has('nonexistent')).toBe(false);
	});

	it('should get a value by key', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		expect(store.get('key1')).toBe('value1');
		expect(store.get('nonexistent')).toBeUndefined();
	});

	it('should clear all entries', () => {
		const store = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		store.clear();

		expect(store.has('key1')).toBe(false);
		expect(store.list).toEqual([]);
		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			[],
			expect.any(Object)
		);
	});

	it('should use schema validation when provided', () => {
		const keySchema = z.string();
		const valueSchema = z.number();

		vi.mocked(getValidatedLocalStorageModule.getValidatedLocalStorage).mockReturnValue({
			success: true,
			data: [
				['num1', 1],
				['num2', 2]
			]
		});

		const store = new MapStore<string, number>(testKey, keySchema, valueSchema);

		store.set('num3', 3);

		expect(setValidatedLocalStorageModule.setValidatedLocalStorage).toHaveBeenCalledWith(
			`store_${testKey}`,
			expect.arrayContaining([['num3', 3]]),
			expect.any(Object)
		);
	});

	it('should maintain singleton instances using getInstance', () => {
		const store1 = MapStore.getInstance<string, string>(
			testKey,
			stringKeySchema,
			stringValueSchema
		);
		const store2 = MapStore.getInstance<string, string>(
			testKey,
			stringKeySchema,
			stringValueSchema
		);

		expect(store1).toBe(store2); // Same instance should be returned
	});

	it('should extract schemas from getInstance arguments', () => {
		const keySchema = z.string();
		const valueSchema = z.number();

		// Mock implementation to verify schemas are correctly passed
		// @ts-expect-error - mocking static method for testing
		vi.spyOn(AbstractStore, 'getCommonInstance').mockImplementation((_ctor, args) => {
			// Just return args for verification
			return args;
		});

		const result = MapStore.getInstance<string, number>('test', keySchema, valueSchema);

		// Check that schemas were correctly extracted and passed to getCommonInstance
		expect(result).toEqual([keySchema, valueSchema]);
	});

	it('should validate values with schemas', () => {
		// Specifically check schema validation
		const keySchema = z.string().min(3);
		const valueSchema = z.string().email();

		const store = new MapStore<string, string>('validation-test', keySchema, valueSchema);

		// Valid entries
		store.set('validKey', 'test@example.com');
		expect(store.get('validKey')).toBe('test@example.com');

		// Invalid key
		expect(() => store.set('ab', 'test@example.com')).toThrow();

		// Invalid value
		expect(() => store.set('validKey', 'not-an-email')).toThrow();
	});

	it('should maintain singleton behavior', () => {
		// Two instances with the same key should reference the same store
		const store1 = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);
		const store2 = new MapStore<string, string>(testKey, stringKeySchema, stringValueSchema);

		store1.set('singleton-test', 'singleton-value');
		expect(store2.get('singleton-test')).toBe('singleton-value');
	});
});
