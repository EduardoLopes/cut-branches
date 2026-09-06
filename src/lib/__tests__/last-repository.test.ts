import { beforeEach, describe, expect, it } from 'vitest';
import { lastRepository, readPersistedLastRepository } from '../last-repository.svelte';

const STORAGE_KEY = 'last-repository';

describe('readPersistedLastRepository', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('returns the persisted id', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify('abc'));
		expect(readPersistedLastRepository()).toBe('abc');
	});

	it('returns undefined when nothing is persisted', () => {
		expect(readPersistedLastRepository()).toBeUndefined();
	});

	it('returns undefined when the persisted value is an empty string', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(''));
		expect(readPersistedLastRepository()).toBeUndefined();
	});

	it('returns undefined when the persisted value is not a string', () => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: 'abc' }));
		expect(readPersistedLastRepository()).toBeUndefined();
	});
});

describe('lastRepository store', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('exposes the current id and persists updates', () => {
		lastRepository.set('abc');

		expect(lastRepository.current).toBe('abc');
		expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('abc'));
	});

	it('ignores an empty id so a good memory is never erased', () => {
		lastRepository.set('abc');

		lastRepository.set('');

		expect(lastRepository.current).toBe('abc');
		expect(localStorage.getItem(STORAGE_KEY)).toBe(JSON.stringify('abc'));
	});
});
