import { describe, it, expect } from 'vitest';
import {
	getSelectedBranchesStore,
	getSelectedDeletedBranchesStore
} from '../selected-branches.svelte';
import { SetStore } from '$utils/set-store.svelte';

describe('Selected Branches Stores', () => {
	describe('getSelectedBranchesStore', () => {
		it('should return undefined if no repository is provided', () => {
			expect(getSelectedBranchesStore()).toBeUndefined();
		});

		it('should return an instance of SetStore if repository is provided', () => {
			const repository = 'test-repo';
			const store = getSelectedBranchesStore(repository);
			expect(store).toBeInstanceOf(SetStore);
		});

		it('should return undefined for empty string repository', () => {
			expect(getSelectedBranchesStore('')).toBeUndefined();
		});

		it('should return same instance for same repository (singleton pattern)', () => {
			const store1 = getSelectedBranchesStore('same-repo');
			const store2 = getSelectedBranchesStore('same-repo');
			expect(store1).toBe(store2);
		});
	});

	describe('getSelectedDeletedBranchesStore', () => {
		it('should return undefined if no repository is provided', () => {
			expect(getSelectedDeletedBranchesStore()).toBeUndefined();
		});

		it('should return an instance of SetStore if repository is provided', () => {
			const repository = 'test-repo';
			const store = getSelectedDeletedBranchesStore(repository);
			expect(store).toBeInstanceOf(SetStore);
		});

		it('should return undefined for empty string repository', () => {
			expect(getSelectedDeletedBranchesStore('')).toBeUndefined();
		});

		it('should return same instance for same repository (singleton pattern)', () => {
			const store1 = getSelectedDeletedBranchesStore('same-repo');
			const store2 = getSelectedDeletedBranchesStore('same-repo');
			expect(store1).toBe(store2);
		});

		it('should create different stores for selected vs deleted branches', () => {
			const selectedStore = getSelectedBranchesStore('test-repo');
			const deletedStore = getSelectedDeletedBranchesStore('test-repo');
			expect(selectedStore).not.toBe(deletedStore);
		});
	});
});
