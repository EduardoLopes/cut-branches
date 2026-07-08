import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod/v4';
import {
	getKeptPaths,
	isKept,
	keepAll,
	keepNone,
	toggleKept
} from '../use-cleanup-keeplist.svelte';
import { Store } from '$lib/store.svelte';

// Reset the singleton store's in-memory + persisted state before each test.
beforeEach(() => {
	localStorage.clear();
	Store.getInstance(['cleanup-keeplist'], z.record(z.string(), z.array(z.string())), {}).set({});
});

describe('use-cleanup-keeplist', () => {
	it('keeps nothing by default', () => {
		expect(getKeptPaths('repo-1')).toEqual([]);
		expect(isKept('repo-1', '/a/node_modules')).toBe(false);
	});

	it('toggleKept adds then removes a path', () => {
		toggleKept('repo-1', '/a/node_modules');
		expect(isKept('repo-1', '/a/node_modules')).toBe(true);
		expect(getKeptPaths('repo-1')).toEqual(['/a/node_modules']);

		toggleKept('repo-1', '/a/node_modules');
		expect(isKept('repo-1', '/a/node_modules')).toBe(false);
		expect(getKeptPaths('repo-1')).toEqual([]);
	});

	it('keepAll keeps every given path and keepNone clears them', () => {
		keepAll('repo-1', ['/a/dist', '/a/build']);
		expect(getKeptPaths('repo-1')).toEqual(['/a/dist', '/a/build']);

		keepNone('repo-1');
		expect(getKeptPaths('repo-1')).toEqual([]);
	});

	it('isolates keep-lists per repository', () => {
		toggleKept('repo-1', '/a/dist');
		toggleKept('repo-2', '/b/target');
		expect(getKeptPaths('repo-1')).toEqual(['/a/dist']);
		expect(getKeptPaths('repo-2')).toEqual(['/b/target']);
		expect(isKept('repo-1', '/b/target')).toBe(false);
	});

	it('persists kept paths across store instances (localStorage)', () => {
		keepAll('repo-1', ['/a/dist']);
		// A fresh read goes through the persisted store.
		expect(getKeptPaths('repo-1')).toEqual(['/a/dist']);
	});
});
